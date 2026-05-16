import "server-only";

import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import postgres from "postgres";
import type { Sql } from "postgres";
import { err, ok, type ServiceResult } from "@/types/common";

/**
 * Email-based auth.
 *
 * Flow:
 *   1. `requestCode(email)` generates a 6-digit code, stores its SHA-256 hash,
 *      and either emails it (if Resend is configured) or returns it in the
 *      response as a clearly labeled `demoCode` (so the local/preview flow is
 *      usable without an email server).
 *   2. `verifyCode(email, code)` consumes a matching unconsumed code, creates
 *      or finds an `auth_users` row, and returns a fresh session token.
 *   3. `getSession(token)` resolves the session and returns the user with any
 *      linked wallets.
 *   4. `linkWallet(userId, address)` records a wallet → user mapping. A wallet
 *      can only be linked to one user.
 *
 * Cookie storage and the HTTP layer live in `lib/services/auth-cookie.ts`.
 */

let sql: Sql | null = null;

function client(): Sql {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  sql = postgres(url, { ssl: "require", max: 4, idle_timeout: 20, prepare: false });
  return sql;
}

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  linkedWallets: string[];
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

async function sendCodeEmail(email: string, code: string): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM || "LeapVault <onboarding@resend.dev>";
  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured (demo mode)" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: email,
        subject: `LeapVault sign-in code: ${code}`,
        html: `<p>Your LeapVault sign-in code is:</p><h2 style="font-family:monospace;letter-spacing:0.2em;">${code}</h2><p>Expires in 10 minutes.</p><p style="color:#888;font-size:12px;">If you didn't request this, you can ignore this email.</p>`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { sent: false, reason: `Resend HTTP ${res.status}: ${text.slice(0, 160)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: (e as Error).message };
  }
}

export async function requestCode(
  email: string,
): Promise<ServiceResult<{ delivered: boolean; demoCode?: string; reason?: string }>> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return err("validation", "Enter a valid email address.");
  }
  const code = generateCode();
  const codeHash = sha256(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  try {
    const c = client();
    await c`
      insert into auth_codes (email, code_hash, expires_at)
      values (${normalized}, ${codeHash}, ${expiresAt})
      on conflict (email, code_hash) do nothing
    `;
  } catch (e) {
    return err("upstream", `DB error: ${(e as Error).message}`);
  }

  const delivery = await sendCodeEmail(normalized, code);
  if (delivery.sent) {
    return ok({ delivered: true });
  }
  // Demo mode: surface the code so the UI can show it.
  return ok({ delivered: false, demoCode: code, reason: delivery.reason });
}

export async function verifyCode(
  email: string,
  code: string,
  meta: { userAgent?: string | null; ipHash?: string | null } = {},
): Promise<ServiceResult<AuthSession>> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return err("validation", "Enter a valid email address.");
  }
  if (!/^\d{6}$/.test(code.trim())) {
    return err("validation", "Code must be 6 digits.");
  }
  const codeHash = sha256(code.trim());

  try {
    const c = client();

    const rows = await c<
      { email: string; code_hash: string; expires_at: string; consumed_at: string | null }[]
    >`
      select email, code_hash, expires_at, consumed_at
      from auth_codes
      where email = ${normalized} and code_hash = ${codeHash}
      limit 1
    `;
    if (rows.length === 0) {
      return err("validation", "Code is incorrect or expired.");
    }
    const row = rows[0];
    if (row.consumed_at) {
      return err("validation", "Code has already been used.");
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return err("validation", "Code is expired. Request a new one.");
    }
    // Constant-time comparison just in case.
    const a = Buffer.from(row.code_hash, "hex");
    const b = Buffer.from(codeHash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return err("validation", "Code is incorrect.");
    }

    await c`
      update auth_codes
      set consumed_at = now()
      where email = ${normalized} and code_hash = ${codeHash}
    `;

    const upserted = await c<{ id: string; email: string; created_at: string; last_login_at: string | null }[]>`
      insert into auth_users (email, last_login_at)
      values (${normalized}, now())
      on conflict (email) do update set last_login_at = now()
      returning id, email, created_at, last_login_at
    `;
    const user = upserted[0];

    const token = randomBytes(32).toString("hex");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await c`
      insert into auth_sessions (token, user_id, expires_at, user_agent, ip_hash)
      values (${tokenHash}, ${user.id}, ${expiresAt}, ${meta.userAgent ?? null}, ${meta.ipHash ?? null})
    `;

    const wallets = await c<{ wallet_address: string }[]>`
      select wallet_address from auth_user_wallets where user_id = ${user.id}
    `;

    return ok({
      token, // raw token returned to caller; only the hash is stored
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        linkedWallets: wallets.map((w) => w.wallet_address),
      },
    });
  } catch (e) {
    return err("upstream", `DB error: ${(e as Error).message}`);
  }
}

export async function getSession(token: string): Promise<ServiceResult<AuthSession>> {
  if (!token) return err("unauthorized", "No session token.");
  const tokenHash = sha256(token);
  try {
    const c = client();
    const rows = await c<
      {
        token: string;
        expires_at: string;
        id: string;
        email: string;
        created_at: string;
        last_login_at: string | null;
      }[]
    >`
      select s.token, s.expires_at, u.id, u.email, u.created_at, u.last_login_at
      from auth_sessions s
      join auth_users u on u.id = s.user_id
      where s.token = ${tokenHash}
      limit 1
    `;
    if (rows.length === 0) return err("unauthorized", "Session not found.");
    const row = rows[0];
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return err("unauthorized", "Session expired.");
    }
    const wallets = await c<{ wallet_address: string }[]>`
      select wallet_address from auth_user_wallets where user_id = ${row.id}
    `;
    return ok({
      token,
      expiresAt: row.expires_at,
      user: {
        id: row.id,
        email: row.email,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        linkedWallets: wallets.map((w) => w.wallet_address),
      },
    });
  } catch (e) {
    return err("upstream", `DB error: ${(e as Error).message}`);
  }
}

export async function logout(token: string): Promise<ServiceResult<true>> {
  if (!token) return ok(true as const);
  try {
    const c = client();
    await c`delete from auth_sessions where token = ${sha256(token)}`;
    return ok(true as const);
  } catch (e) {
    return err("upstream", `DB error: ${(e as Error).message}`);
  }
}

export async function linkWallet(
  userId: string,
  walletAddress: string,
): Promise<ServiceResult<true>> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return err("validation", "Invalid wallet address.");
  }
  try {
    const c = client();
    await c`
      insert into auth_user_wallets (user_id, wallet_address)
      values (${userId}, ${walletAddress.toLowerCase()})
      on conflict (user_id, wallet_address) do nothing
    `;
    return ok(true as const);
  } catch (e) {
    return err("upstream", `DB error: ${(e as Error).message}`);
  }
}

export async function unlinkWallet(
  userId: string,
  walletAddress: string,
): Promise<ServiceResult<true>> {
  try {
    const c = client();
    await c`
      delete from auth_user_wallets
      where user_id = ${userId} and wallet_address = ${walletAddress.toLowerCase()}
    `;
    return ok(true as const);
  } catch (e) {
    return err("upstream", `DB error: ${(e as Error).message}`);
  }
}

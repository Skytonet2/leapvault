import "server-only";

/**
 * Wallet ↔ Telegram chat binding store.
 *
 * Two-stage flow:
 *   1. App generates a short-lived `code` for a wallet → returns deep link
 *      `https://t.me/<bot>?start=<code>`.
 *   2. User taps Start in Telegram → bot webhook receives `/start <code>` →
 *      we resolve code → wallet and persist `{wallet, chatId, username}`.
 *
 * Both stages happen in different Vercel serverless invocations, so the code
 * AND the binding MUST be in Postgres — in-memory state would not survive.
 */

import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/database/client";

export interface TelegramBinding {
  wallet: `0x${string}`;
  chatId: number;
  username?: string;
  firstName?: string;
  createdAt: number;
}

const CODE_TTL_MS = 1000 * 60 * 15; // 15 minutes

function normalizeWallet(w: string): `0x${string}` {
  return w.toLowerCase() as `0x${string}`;
}

export async function createBindingCode(
  wallet: `0x${string}`,
): Promise<string | null> {
  const db = getDb();
  if (!db.createTelegramBindingCode) return null;
  const code = randomBytes(6).toString("hex");
  const result = await db.createTelegramBindingCode(
    normalizeWallet(wallet),
    code,
    CODE_TTL_MS,
  );
  if (!result.ok) return null;
  return code;
}

export async function consumeBindingCode(
  code: string,
): Promise<`0x${string}` | null> {
  const db = getDb();
  if (!db.consumeTelegramBindingCode) return null;
  const result = await db.consumeTelegramBindingCode(code);
  if (!result.ok) return null;
  return result.data;
}

export async function saveBinding(
  binding: Omit<TelegramBinding, "createdAt">,
): Promise<TelegramBinding | null> {
  const db = getDb();
  if (!db.saveTelegramBinding) return null;
  const result = await db.saveTelegramBinding({
    wallet: normalizeWallet(binding.wallet),
    chatId: binding.chatId,
    username: binding.username,
    firstName: binding.firstName,
  });
  if (!result.ok) return null;
  return {
    ...binding,
    wallet: normalizeWallet(binding.wallet),
    createdAt: Date.now(),
  };
}

export async function getBindingByWallet(
  wallet: string,
): Promise<TelegramBinding | null> {
  const db = getDb();
  if (!db.getTelegramBindingByWallet) return null;
  const result = await db.getTelegramBindingByWallet(normalizeWallet(wallet));
  if (!result.ok) return null;
  return result.data;
}

export async function removeBinding(wallet: string): Promise<boolean> {
  const db = getDb();
  if (!db.removeTelegramBinding) return false;
  const result = await db.removeTelegramBinding(normalizeWallet(wallet));
  if (!result.ok) return false;
  return result.data;
}

export const TELEGRAM_BINDING_TTL_MS = CODE_TTL_MS;

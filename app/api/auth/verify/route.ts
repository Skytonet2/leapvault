import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { verifyCode } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/services/auth-cookie";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid email or code." } },
      { status: 400 },
    );
  }
  const userAgent = req.headers.get("user-agent") ?? null;
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : null;

  const result = await verifyCode(parsed.data.email, parsed.data.code, {
    userAgent,
    ipHash: hashIp(ip),
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 });
  }
  setSessionCookie(result.data.token);
  return NextResponse.json({
    ok: true,
    data: { user: result.data.user, expiresAt: result.data.expiresAt },
  });
}

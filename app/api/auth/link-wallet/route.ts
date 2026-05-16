import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, linkWallet, unlinkWallet } from "@/lib/services/auth";
import { readSessionCookie } from "@/lib/services/auth-cookie";
import { evmAddress } from "@/lib/validators/evm";

export const runtime = "nodejs";

const schema = z.object({
  wallet: evmAddress,
  action: z.enum(["link", "unlink"]).default("link"),
});

export async function POST(req: Request) {
  const token = readSessionCookie();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: { kind: "unauthorized", message: "Sign in first." } },
      { status: 401 },
    );
  }
  const session = await getSession(token);
  if (!session.ok) {
    return NextResponse.json(session, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid request." } },
      { status: 400 },
    );
  }
  const fn = parsed.data.action === "unlink" ? unlinkWallet : linkWallet;
  const result = await fn(session.data.user.id, parsed.data.wallet);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

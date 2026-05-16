import { NextResponse } from "next/server";
import { getSession } from "@/lib/services/auth";
import { readSessionCookie } from "@/lib/services/auth-cookie";

export const runtime = "nodejs";

export async function GET() {
  const token = readSessionCookie();
  if (!token) {
    return NextResponse.json({ ok: true, data: { user: null } });
  }
  const result = await getSession(token);
  if (!result.ok) {
    return NextResponse.json({ ok: true, data: { user: null } });
  }
  return NextResponse.json({
    ok: true,
    data: { user: result.data.user, expiresAt: result.data.expiresAt },
  });
}

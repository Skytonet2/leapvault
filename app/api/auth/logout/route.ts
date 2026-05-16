import { NextResponse } from "next/server";
import { logout } from "@/lib/services/auth";
import { clearSessionCookie, readSessionCookie } from "@/lib/services/auth-cookie";

export const runtime = "nodejs";

export async function POST() {
  const token = readSessionCookie();
  if (token) {
    await logout(token);
  }
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

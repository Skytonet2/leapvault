import { NextResponse } from "next/server";
import { getRealClawHealth } from "@/lib/integrations/realclaw/health";

export const runtime = "nodejs";

export async function GET() {
  const health = await getRealClawHealth();
  return NextResponse.json({ ok: true, data: health });
}

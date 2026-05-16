import { NextResponse } from "next/server";
import { getRwaAssets } from "@/lib/services/rwa";

export const runtime = "nodejs";

export async function GET() {
  const result = await getRwaAssets();
  return NextResponse.json(result);
}

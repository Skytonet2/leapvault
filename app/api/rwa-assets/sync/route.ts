import { NextResponse } from "next/server";
import { syncRwaAssetsFromDefiLlama } from "@/lib/services/rwa-sync";

export const runtime = "nodejs";
// Pulls ~10k pools and writes 8–12 rows; one DefiLlama fetch + N upserts.
export const maxDuration = 60;

/**
 * POST /api/rwa-assets/sync
 *
 * Refresh the RWA Monitor data from DefiLlama. Idempotent — upserts on
 * (network, contract_address). Safe to invoke from the UI.
 */
export async function POST() {
  const result = await syncRwaAssetsFromDefiLlama();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

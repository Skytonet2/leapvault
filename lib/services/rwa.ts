import "server-only";

import type { RwaAsset, RwaRiskBreakdown } from "@/types/rwa";
import type { ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";

export async function getRwaAssets(): Promise<ServiceResult<RwaAsset[]>> {
  return getDb().listRwaAssets();
}

export async function getRwaAssetByAddress(
  address: `0x${string}`,
): Promise<ServiceResult<RwaAsset>> {
  return getDb().getRwaAssetByAddress(address);
}

/**
 * Composite risk score derived from a populated breakdown.
 *
 * Returns `null` if any factor is missing — we never invent a score from
 * partial data, which is the whole point of the trust-focused UI.
 */
export function computeRwaRiskScore(b: RwaRiskBreakdown): number | null {
  const values = Object.values(b);
  if (values.some((v) => v === null)) return null;
  const weights = {
    liquidity: 0.18,
    issuerTransparency: 0.14,
    yieldVolatility: 0.12,
    redemption: 0.12,
    contract: 0.14,
    oracle: 0.1,
    marketDepth: 0.1,
    abnormalMovement: 0.1,
  } satisfies Record<keyof RwaRiskBreakdown, number>;
  let score = 0;
  for (const key of Object.keys(weights) as Array<keyof RwaRiskBreakdown>) {
    score += (b[key] ?? 0) * weights[key];
  }
  return Math.round(score);
}

export async function getRwaRiskBreakdown(
  address: `0x${string}`,
): Promise<ServiceResult<RwaRiskBreakdown>> {
  const result = await getRwaAssetByAddress(address);
  if (!result.ok) return result;
  return { ok: true, data: result.data.riskBreakdown };
}

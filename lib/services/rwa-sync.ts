import "server-only";

import { err, ok, type ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";
import { fetchYieldPools } from "@/lib/integrations/defillama/client";
import { selectRwaPools } from "@/lib/integrations/defillama/rwa";

export interface SyncReport {
  fetched: number;
  selected: number;
  upserted: number;
  failed: number;
  errors: string[];
  source: "defillama";
  syncedAt: string;
}

/**
 * Pull yield pools from DefiLlama, filter to RWA-leaning candidates, and
 * upsert into `rwa_assets`. Idempotent on (network, contract_address).
 */
export async function syncRwaAssetsFromDefiLlama(
  limit = 12,
): Promise<ServiceResult<SyncReport>> {
  const db = getDb();
  if (!db.upsertRwaAsset) {
    return err(
      "not-configured",
      "RWA upsert is not implemented in the active database adapter.",
      "Set DATABASE_URL and run the latest migration.",
    );
  }

  let pools;
  try {
    pools = await fetchYieldPools(true);
  } catch (e) {
    return err("upstream", `DefiLlama fetch failed: ${(e as Error).message}`);
  }

  const candidates = selectRwaPools(pools, limit);
  const errors: string[] = [];
  let upserted = 0;
  let failed = 0;

  for (const c of candidates) {
    const result = await db.upsertRwaAsset(c.asset);
    if (result.ok) {
      upserted += 1;
    } else {
      failed += 1;
      errors.push(`${c.asset.symbol}: ${result.error.message}`);
    }
  }

  return ok({
    fetched: pools.length,
    selected: candidates.length,
    upserted,
    failed,
    errors,
    source: "defillama",
    syncedAt: new Date().toISOString(),
  });
}

import type { RwaAsset, RwaCategory, RwaRiskBreakdown } from "@/types/rwa";
import type { DefiLlamaPool } from "./types";

/**
 * Curated allowlist of RWA-leaning DefiLlama projects.
 *
 * DefiLlama's `category` field for pools is not always "RWA" — many tokenized-
 * treasury and yield-bearing-stable products are tagged differently. This
 * allowlist is the conservative path: pools whose `project` matches one of
 * these slugs are treated as RWA-relevant.
 *
 * Sources: DefiLlama protocol pages for Ondo, Backed, Anzen, Maple, Centrifuge,
 * Mountain, Frax sFRAX, Ethena USDe (stable yield), etc.
 */
const RWA_PROJECTS = new Set([
  "ondo-finance",
  "backed-finance",
  "anzen",
  "maple",
  "maple-finance",
  "centrifuge",
  "mountain-protocol",
  "matrixdock",
  "openeden",
  "superstate",
  "ethena",
  "ethena-usde",
  "sky-savings-rate",
  "sky-lending",
  "makerdao",
  "frax-finance",
  "frax-sfrax",
  "angle",
  "angle-protocol",
  "agave",
  "midas",
  "tprotocol",
  "swarm-markets",
  "init-capital",
  "lendle",
  "agni-finance",
  "fbtc",
  "merchant-moe",
  "stargate",
  "compound-v3",
  "aave-v3",
]);

const CHAIN_ID: Record<string, number> = {
  Ethereum: 1,
  Mantle: 5000,
  Arbitrum: 42161,
  Polygon: 137,
  Optimism: 10,
  Base: 8453,
  Avalanche: 43114,
  BSC: 56,
  Linea: 59144,
  Scroll: 534352,
  Manta: 169,
  Solana: 0, // Non-EVM; map to 0 so unique key still works.
};

/**
 * Heuristic mapping from DefiLlama pool → LeapVault RWA category.
 * Conservative: skewed toward stable-yield + treasuries since that's what
 * actually exists on-chain in volume.
 */
function inferCategory(pool: DefiLlamaPool): RwaCategory {
  const project = pool.project.toLowerCase();
  const symbol = pool.symbol.toUpperCase();
  if (project.includes("ondo") && symbol.includes("OUSG")) return "treasuries";
  if (project.includes("ondo") && symbol.includes("USDY")) return "stable-yield";
  if (project.includes("backed") && symbol.startsWith("B")) return "treasuries";
  if (project.includes("maple")) return "credit";
  if (project.includes("centrifuge")) return "credit";
  if (project.includes("anzen")) return "credit";
  if (project.includes("matrixdock") || project.includes("openeden") || project.includes("superstate")) return "treasuries";
  if (project.includes("mountain")) return "stable-yield";
  if (project.includes("ethena")) return "stable-yield";
  if (project.includes("sky") || project.includes("makerdao")) return "stable-yield";
  if (project.includes("frax")) return "stable-yield";
  // Default for projects in the allowlist that don't match a tighter rule.
  return "stable-yield";
}

interface RwaCandidate {
  pool: DefiLlamaPool;
  asset: Omit<RwaAsset, "id" | "activeMonitoringAgentIds">;
}

/**
 * Map a DefiLlama pool to an `RwaAsset` suitable for upsert.
 *
 * Returns `null` if we cannot construct a strict-typed record — e.g. the pool
 * has no usable underlying contract address, or the chain is unsupported.
 */
export function poolToRwaAsset(pool: DefiLlamaPool): RwaCandidate | null {
  if (!pool.project) return null;
  const network = CHAIN_ID[pool.chain];
  if (network === undefined) return null;

  const underlying = (pool.underlyingTokens ?? []).find((t) => /^0x[a-f0-9]{40}$/i.test(t));
  if (!underlying) return null;

  const apyDecimal = pool.apy !== null ? pool.apy / 100 : null;

  const riskBreakdown: RwaRiskBreakdown = {
    liquidity: pool.tvlUsd && pool.tvlUsd > 10_000_000 ? 20 : pool.tvlUsd && pool.tvlUsd > 1_000_000 ? 40 : 70,
    issuerTransparency: RWA_PROJECTS.has(pool.project.toLowerCase()) ? 25 : 60,
    yieldVolatility: pool.apyReward && pool.apyReward > 0 ? 55 : 25,
    redemption: pool.ilRisk === "yes" ? 70 : 30,
    contract: 35,
    oracle: 30,
    marketDepth: pool.tvlUsd && pool.tvlUsd > 50_000_000 ? 15 : 50,
    abnormalMovement: 30,
  };
  const validRisks = Object.values(riskBreakdown).filter((v): v is number => v !== null);
  const riskScore =
    validRisks.length > 0
      ? Math.round(validRisks.reduce((a, b) => a + b, 0) / validRisks.length)
      : null;

  return {
    pool,
    asset: {
      name: `${pool.symbol} (${pool.project})`,
      symbol: pool.symbol,
      category: inferCategory(pool),
      network,
      contractAddress: underlying.toLowerCase() as `0x${string}`,
      issuer: pool.project,
      dataSource: "defillama",
      currentApy: apyDecimal,
      liquidity: pool.tvlUsd ?? null,
      riskScore,
      riskBreakdown,
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Pick the top RWA-leaning pools.
 *
 * Strategy:
 * 1. Prefer pools on Mantle (any project).
 * 2. Then top N pools where `project` is in the RWA allowlist, by TVL desc.
 *
 * Returns a stable, de-duplicated list.
 */
export function selectRwaPools(pools: DefiLlamaPool[], limit = 12): RwaCandidate[] {
  const seen = new Set<string>();
  const out: RwaCandidate[] = [];

  const consider = (p: DefiLlamaPool) => {
    const mapped = poolToRwaAsset(p);
    if (!mapped) return;
    const key = `${mapped.asset.network}:${mapped.asset.contractAddress}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(mapped);
  };

  // 1. Mantle pools first
  const mantlePools = pools
    .filter((p) => p.chain === "Mantle" && (p.tvlUsd ?? 0) > 100_000)
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
  for (const p of mantlePools) {
    if (out.length >= limit) break;
    consider(p);
  }

  // 2. RWA-allowlist pools on any supported chain, by TVL desc
  const rwaPools = pools
    .filter(
      (p) =>
        RWA_PROJECTS.has(p.project.toLowerCase()) &&
        CHAIN_ID[p.chain] !== undefined &&
        (p.tvlUsd ?? 0) > 1_000_000 &&
        (p.apy ?? 0) > 0,
    )
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
  for (const p of rwaPools) {
    if (out.length >= limit) break;
    consider(p);
  }

  return out;
}

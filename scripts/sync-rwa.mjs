/**
 * Local one-shot sync from DefiLlama → rwa_assets.
 *
 * Usage:
 *   node --env-file=.env.local scripts/sync-rwa.mjs
 *
 * Same logic as the /api/rwa-assets/sync route, but runs from your machine
 * against the configured DATABASE_URL.
 */

import postgres from "postgres";

const POOLS_URL = "https://yields.llama.fi/pools";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", prepare: false });

const RWA_PROJECTS = new Set([
  "ondo-finance", "backed-finance", "anzen", "maple", "maple-finance",
  "centrifuge", "mountain-protocol", "matrixdock", "openeden", "superstate",
  "ethena", "ethena-usde", "sky-savings-rate", "sky-lending", "makerdao",
  "frax-finance", "frax-sfrax", "angle", "angle-protocol", "agave",
  "midas", "tprotocol", "swarm-markets", "init-capital", "lendle",
  "agni-finance", "fbtc", "merchant-moe", "stargate", "compound-v3", "aave-v3",
]);

const CHAIN_ID = {
  Ethereum: 1, Mantle: 5000, Arbitrum: 42161, Polygon: 137,
  Optimism: 10, Base: 8453, Avalanche: 43114, BSC: 56,
  Linea: 59144, Scroll: 534352, Manta: 169, Solana: 0,
};

function inferCategory(pool) {
  const project = pool.project.toLowerCase();
  const symbol = (pool.symbol || "").toUpperCase();
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
  return "stable-yield";
}

function poolToCandidate(pool) {
  if (!pool.project) return null;
  const network = CHAIN_ID[pool.chain];
  if (network === undefined) return null;
  const underlying = (pool.underlyingTokens ?? []).find((t) => /^0x[a-f0-9]{40}$/i.test(t));
  if (!underlying) return null;
  const apyDecimal = pool.apy !== null ? pool.apy / 100 : null;
  const riskBreakdown = {
    liquidity: pool.tvlUsd && pool.tvlUsd > 10_000_000 ? 20 : pool.tvlUsd && pool.tvlUsd > 1_000_000 ? 40 : 70,
    issuerTransparency: RWA_PROJECTS.has(pool.project.toLowerCase()) ? 25 : 60,
    yieldVolatility: pool.apyReward && pool.apyReward > 0 ? 55 : 25,
    redemption: pool.ilRisk === "yes" ? 70 : 30,
    contract: 35, oracle: 30,
    marketDepth: pool.tvlUsd && pool.tvlUsd > 50_000_000 ? 15 : 50,
    abnormalMovement: 30,
  };
  const vals = Object.values(riskBreakdown);
  const riskScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  return {
    name: `${pool.symbol} (${pool.project})`,
    symbol: pool.symbol,
    category: inferCategory(pool),
    network,
    contract_address: underlying.toLowerCase(),
    issuer: pool.project,
    data_source: "defillama",
    current_apy: apyDecimal,
    liquidity: pool.tvlUsd ?? null,
    risk_score: riskScore,
    risk_breakdown: riskBreakdown,
    last_updated: new Date().toISOString(),
  };
}

function selectRwaPools(pools, limit = 12) {
  const seen = new Set();
  const out = [];

  const consider = (p) => {
    const c = poolToCandidate(p);
    if (!c) return;
    const key = `${c.network}:${c.contract_address}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  const mantlePools = pools
    .filter((p) => p.chain === "Mantle" && (p.tvlUsd ?? 0) > 100_000)
    .sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
  for (const p of mantlePools) {
    if (out.length >= limit) break;
    consider(p);
  }

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

async function run() {
  console.log("Fetching DefiLlama yield pools…");
  const res = await fetch(POOLS_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`);
  const json = await res.json();
  console.log(`  ${json.data.length} pools fetched`);

  const candidates = selectRwaPools(json.data, 12);
  console.log(`Selected ${candidates.length} RWA candidates:`);
  for (const c of candidates) {
    console.log(`  - ${c.symbol.padEnd(18)} ${c.category.padEnd(14)} chain=${c.network} apy=${c.current_apy?.toFixed(4) ?? "—"} tvl=$${c.liquidity?.toLocaleString() ?? "—"}`);
  }

  let upserted = 0;
  for (const c of candidates) {
    try {
      await sql`
        insert into rwa_assets (
          name, symbol, category, network, contract_address, issuer,
          data_source, current_apy, liquidity, risk_score, risk_breakdown, last_updated
        ) values (
          ${c.name}, ${c.symbol}, ${c.category}, ${c.network},
          ${c.contract_address}, ${c.issuer},
          ${c.data_source}, ${c.current_apy}, ${c.liquidity},
          ${c.risk_score}, ${JSON.stringify(c.risk_breakdown)}::jsonb,
          ${c.last_updated}
        )
        on conflict (network, contract_address) do update set
          name = excluded.name,
          symbol = excluded.symbol,
          category = excluded.category,
          issuer = excluded.issuer,
          data_source = excluded.data_source,
          current_apy = excluded.current_apy,
          liquidity = excluded.liquidity,
          risk_score = excluded.risk_score,
          risk_breakdown = excluded.risk_breakdown,
          last_updated = excluded.last_updated
      `;
      upserted += 1;
    } catch (e) {
      console.error(`  upsert failed for ${c.symbol}:`, e.message);
    }
  }
  console.log(`\n✓ Upserted ${upserted}/${candidates.length} assets.`);
  await sql.end();
}

run().catch(async (e) => {
  console.error("Sync failed:", e);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});

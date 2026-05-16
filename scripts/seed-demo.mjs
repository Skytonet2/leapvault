/**
 * Seed real demo content by walking the live production endpoints.
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs
 *
 * What it does:
 *   1. Runs a couple of agents against a deterministic "demo" wallet — produces
 *      real alerts in the DB via /api/agents/run (live Mantle RPC + NVIDIA AI).
 *   2. Creates proposals from those alerts via /api/execution/proposals.
 *   3. Approves the proposals (dry-run, no fund movement) via /api/execution/approve.
 *
 * Output is real: alerts have AI-generated explanations, proposals carry real
 * IDs, reputation counters move. Anyone landing on /alerts or /proposals while
 * connected as the demo wallet will see a populated dashboard.
 *
 * Safe to run multiple times. Each invocation adds fresh signals; existing rows
 * are not duplicated because alerts include block numbers / timestamps.
 */

const BASE = process.env.SEED_TARGET || "https://leapvault-agent.vercel.app";
const DEMO_WALLET = process.env.SEED_WALLET || "0x000000000000000000000000000000000000dEAD";

const AGENTS = [
  { slug: "smart-wallet-tracker", timeout: 90_000 },
  { slug: "rwa-yield-risk", timeout: 120_000 },
  { slug: "reputation", timeout: 90_000 },
  { slug: "portfolio-risk", timeout: 90_000 },
  { slug: "liquidity-flow", timeout: 90_000 },
  { slug: "token-risk", timeout: 90_000 },
  { slug: "whale-alert", timeout: 90_000 },
];

async function postJson(path, body, timeoutMs = 60_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

async function getJson(path) {
  const res = await fetch(BASE + path, { cache: "no-store" });
  return res.json();
}

function fmt(obj) {
  return JSON.stringify(obj).slice(0, 200);
}

async function runAgentWithRetry(slug, timeoutMs, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await postJson(
      "/api/agents/run",
      { wallet: DEMO_WALLET, agentSlug: slug },
      timeoutMs,
    );
    if (result?.ok) return result;
    if (attempt < retries) {
      console.log(`    retry (${result?.error?.message ?? "no body"})`);
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      return result;
    }
  }
}

async function main() {
  console.log(`Seeding demo content against ${BASE}`);
  console.log(`Demo wallet: ${DEMO_WALLET}\n`);

  const created = [];

  for (const agent of AGENTS) {
    console.log(`▸ Running ${agent.slug}…`);
    const runResult = await runAgentWithRetry(agent.slug, agent.timeout);
    if (!runResult?.ok) {
      console.log(`  ✗ run failed: ${fmt(runResult)}\n`);
      continue;
    }
    const alert = runResult.data.alert;
    console.log(`  ✓ alert ${alert.id}`);
    console.log(`    severity=${alert.severity} confidence=${alert.confidence}`);

    const propResult = await postJson(
      "/api/execution/proposals",
      { wallet: DEMO_WALLET, alertId: alert.id },
      30_000,
    );
    if (!propResult?.ok) {
      console.log(`  ✗ proposal failed: ${fmt(propResult)}\n`);
      continue;
    }
    const prop = propResult.data;
    console.log(`  ✓ proposal ${prop.id} (${prop.actionType} via ${prop.provider})`);

    const appResult = await postJson(
      "/api/execution/approve",
      { wallet: DEMO_WALLET, proposalId: prop.id, decision: "approve" },
      60_000,
    );
    if (!appResult?.ok) {
      console.log(`  ✗ approve failed: ${fmt(appResult)}\n`);
      continue;
    }
    const exec = appResult.data.result;
    console.log(
      `  ✓ executed status=${exec.status} dryRun=${exec.dryRun}` +
        (exec.transactionHash ? ` tx=${exec.transactionHash}` : ""),
    );
    created.push({ alert: alert.id, proposal: prop.id, exec: exec.status });
    console.log("");
  }

  console.log(`\nSummary: ${created.length}/${AGENTS.length} agents seeded.`);
  if (created.length > 0) {
    console.log("\nVisit /proposals connected as the demo wallet to see the loop end-to-end.");
  }
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});

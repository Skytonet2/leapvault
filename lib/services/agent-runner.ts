import "server-only";

import type { Address } from "viem";
import { createPublicClient, http } from "viem";
import { mantle, mantleSepolia, explorerLink } from "@/lib/chains/mantle";
import { err, ok, type ServiceResult } from "@/types/common";
import type { Agent, AgentCategory } from "@/types/agent";
import type { Alert, AlertSeverity, AlertType } from "@/types/alert";
import { getDb } from "@/lib/database/client";
import {
  generateAlertExplanation,
  generateRwaAssetReport,
  generateWalletMovementSummary,
} from "@/lib/ai/prompts";
import type { AlertExplanation, RwaAssetReport, WalletMovementSummary } from "@/lib/ai/prompts";
import { notifyAlertViaTelegram } from "@/lib/services/telegram-alerts";
import { getPlan, isSubscribed, subscriptionsConfigured } from "@/lib/contracts/subscriptions";

/**
 * Single-run agent orchestrator.
 *
 * For each agent category, we:
 *   1. Gather real-ish context (live Mantle block read where possible,
 *      DB-backed RWA row where one exists, deterministic seed otherwise).
 *   2. Call the matching AI prompt — the alert text is genuinely AI-generated.
 *   3. Persist a real `alerts` row tied to the user wallet + agent.
 *
 * This makes the "Run agent" button produce real artifacts: a real DB row, a
 * real AI provider call (visible in /api/ai/status), and a real source link.
 *
 * Where a deeper data adapter is not yet wired (wallet tx history, DEX pool
 * indexer), the alert is honest about it via the AI's `dataLimitations` field.
 */

export interface RunAgentInput {
  userWallet: `0x${string}`;
  agentSlug: string;
  /** Optional override network. Defaults to NEXT_PUBLIC_DEFAULT_NETWORK. */
  network?: 5000 | 5003;
}

export interface RunAgentResult {
  alert: Alert;
  agent: Agent;
}

function defaultNetwork(): 5000 | 5003 {
  return process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mantle" ? 5000 : 5003;
}

function rpcFor(network: 5000 | 5003) {
  const chain = network === 5000 ? mantle : mantleSepolia;
  const url =
    network === 5000
      ? process.env.NEXT_PUBLIC_MANTLE_RPC_URL || "https://rpc.mantle.xyz"
      : process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz";
  return createPublicClient({ chain, transport: http(url) });
}

export async function runAgent(input: RunAgentInput): Promise<ServiceResult<RunAgentResult>> {
  const db = getDb();
  const agentRes = await db.getAgentBySlug(input.agentSlug);
  if (!agentRes.ok) return agentRes;
  const agent = agentRes.data;

  if (!db.insertAlert) {
    return err(
      "not-configured",
      "Database is not configured to write alerts.",
      "Run scripts/migrate.mjs against your Postgres instance.",
    );
  }

  // Subscription gate. If this agent has an on-chain Plan, the caller must
  // hold an active subscription. Free agents (no Plan) and environments
  // without SUBSCRIPTION_CONTRACT skip this check.
  if (subscriptionsConfigured()) {
    const plan = await getPlan(input.agentSlug);
    if (plan && plan.active && plan.pricePerMonth > 0n) {
      const subscribed = await isSubscribed(input.agentSlug, input.userWallet);
      if (!subscribed) {
        return err(
          "validation",
          `${agent.name} requires an active subscription. Open the agent profile to subscribe with MNT on ${
            process.env.NEXT_PUBLIC_MANTLE_NETWORK === "mantle" ? "Mantle" : "Mantle Sepolia"
          }.`,
        );
      }
    }
  }

  const network = input.network ?? defaultNetwork();

  let alertPayload: Omit<Alert, "id" | "createdAt">;
  try {
    alertPayload = await dispatchByCategory({
      agent,
      userWallet: input.userWallet,
      network,
    });
  } catch (e) {
    const msg = (e as Error).message;
    const isTimeout = /timed out/i.test(msg);
    return err(
      "upstream",
      isTimeout
        ? `Agent run timed out. The AI provider is cold; tap Run again in a few seconds.`
        : `Agent run failed: ${msg}`,
    );
  }

  const inserted = await db.insertAlert(alertPayload);
  if (!inserted.ok) return inserted;

  // Best-effort Telegram push, awaited because Vercel terminates serverless
  // invocations the moment the response is sent — a fire-and-forget promise
  // would be killed before the fetch finishes. We cap latency at 5s and
  // swallow any error so a failed push never breaks the user request.
  try {
    await Promise.race([
      notifyAlertViaTelegram(inserted.data, agent.name),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  } catch {
    /* swallow */
  }

  return ok({ alert: inserted.data, agent });
}

async function dispatchByCategory(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  switch (args.agent.category as AgentCategory) {
    case "rwa-yield":
      return runRwaYieldAgent(args);
    case "smart-wallet":
      return runSmartWalletAgent(args);
    case "whale":
      return runWhaleAgent(args);
    case "liquidity":
      return runLiquidityAgent(args);
    case "token-risk":
      return runTokenRiskAgent(args);
    case "portfolio-risk":
      return runPortfolioRiskAgent(args);
    case "reputation":
      return runReputationAgent(args);
  }
}

function riskToSeverity(level: WalletMovementSummary["riskLevel"]): AlertSeverity {
  switch (level) {
    case "low":
      return "low";
    case "medium":
      return "medium";
    case "high":
      return "high";
    default:
      return "info";
  }
}

// --------------- RWA Yield ----------------
async function runRwaYieldAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  const db = getDb();
  const list = await db.listRwaAssets();
  const asset = list.ok && list.data.length > 0 ? list.data[0] : null;

  const report: { data: RwaAssetReport } = asset
    ? await generateRwaAssetReport(
        {
          name: asset.name,
          symbol: asset.symbol,
          contractAddress: asset.contractAddress,
          issuer: asset.issuer,
          currentApy: asset.currentApy,
          liquidity: asset.liquidity,
          riskFactors: asset.riskBreakdown
            ? Object.fromEntries(Object.entries(asset.riskBreakdown))
            : undefined,
          dataSource: asset.dataSource,
        },
        { userWallet: args.userWallet },
      )
    : await generateRwaAssetReport(
        {
          name: "Generic RWA yield asset",
          symbol: "RWA",
          contractAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
          issuer: null,
          currentApy: null,
          liquidity: null,
          dataSource: "agent-bootstrap",
        },
        { userWallet: args.userWallet },
      );

  const data = report.data;
  const highestRisk =
    data.riskBreakdown.find((r) => r.level === "high") ??
    data.riskBreakdown.find((r) => r.level === "medium");
  const severity: AlertSeverity = highestRisk
    ? highestRisk.level === "high"
      ? "high"
      : "medium"
    : "low";

  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "rwa-yield-change" as AlertType,
    severity,
    title: data.title,
    explanation:
      data.summary +
      (data.monitoringRecommendation ? `\n\nMonitoring recommendation: ${data.monitoringRecommendation}` : ""),
    confidence: data.confidence,
    sourceType: "agent",
    sourceUrl: asset ? explorerLink(args.network, "address", asset.contractAddress) : null,
    metadata: {
      run: "rwa-yield-risk",
      assetId: asset?.id ?? null,
      yieldExplanation: data.yieldExplanation,
      riskBreakdown: data.riskBreakdown,
      dataLimitations: data.dataLimitations,
    },
    readAt: null,
  };
}

// --------------- Smart Wallet ----------------
async function runSmartWalletAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  // Real live data: latest block + the user wallet's native balance on the
  // selected Mantle network. No fake tx history.
  const rpc = rpcFor(args.network);
  const [block, balance] = await Promise.all([
    rpc.getBlock(),
    rpc.getBalance({ address: args.userWallet as Address }),
  ]);

  const explanation = await generateWalletMovementSummary(
    {
      wallet: args.userWallet,
      transactionType: "balance-snapshot",
      asset: "MNT",
      value: balance.toString(),
      timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
      historicalContext:
        "Live read from Mantle RPC. Wallet transaction history requires an indexer adapter and is intentionally absent.",
    },
    { userWallet: args.userWallet },
  );

  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "wallet-movement" as AlertType,
    severity: riskToSeverity(explanation.data.riskLevel),
    title: explanation.data.title,
    explanation:
      explanation.data.summary +
      (explanation.data.whyItMatters ? `\n\nWhy it matters: ${explanation.data.whyItMatters}` : ""),
    confidence: explanation.data.confidence,
    sourceType: "onchain",
    sourceUrl: explorerLink(args.network, "address", args.userWallet),
    metadata: {
      run: "smart-wallet-tracker",
      blockNumber: block.number?.toString() ?? null,
      blockTimestamp: Number(block.timestamp),
      nativeBalanceWei: balance.toString(),
      dataLimitations: explanation.data.dataLimitations,
    },
    readAt: null,
  };
}

// --------------- Whale ----------------
async function runWhaleAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  // Read the latest block. We surface block-level liveness and let the AI
  // produce a structured "monitoring active" alert with honest limitations.
  const rpc = rpcFor(args.network);
  const block = await rpc.getBlock();

  const exp = await generateAlertExplanation(
    {
      alertType: "whale-monitoring-active",
      severity: "info",
      subject: { kind: "network", ref: args.network === 5000 ? "mantle-mainnet" : "mantle-sepolia" },
      dataSource: "mantle-rpc",
      sourceData: {
        latestBlock: block.number?.toString() ?? null,
        latestBlockTimestamp: Number(block.timestamp),
        note: "Whale flow analysis requires a high-volume transfer indexer; this run confirms agent liveness and network reachability.",
      },
    },
    { userWallet: args.userWallet },
  );

  return whaleStyleAlert(args, exp.data, block.number?.toString() ?? null);
}

function whaleStyleAlert(
  args: { agent: Agent; userWallet: `0x${string}`; network: 5000 | 5003 },
  data: AlertExplanation,
  blockNumber: string | null,
): Omit<Alert, "id" | "createdAt"> {
  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "whale-trade" as AlertType,
    severity: riskToSeverity(data.riskLevel),
    title: data.title,
    explanation:
      data.summary +
      (data.whatToVerify ? `\n\nWhat to verify: ${data.whatToVerify}` : ""),
    confidence: data.confidence,
    sourceType: "onchain",
    sourceUrl: explorerLink(args.network, "address", args.userWallet),
    metadata: {
      run: "whale-alert",
      latestBlock: blockNumber,
      dataLimitations: data.dataLimitations,
    },
    readAt: null,
  };
}

// --------------- Liquidity ----------------
async function runLiquidityAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  const rpc = rpcFor(args.network);
  const block = await rpc.getBlock();

  const exp = await generateAlertExplanation(
    {
      alertType: "liquidity-monitoring-active",
      severity: "info",
      subject: {
        kind: "network",
        ref: args.network === 5000 ? "mantle-mainnet" : "mantle-sepolia",
      },
      dataSource: "mantle-rpc",
      sourceData: {
        latestBlock: block.number?.toString() ?? null,
        note: "Pool-level depth/slippage analysis requires a DEX indexer adapter (Byreal/Agni/etc.). This run confirms liveness and prepares the agent for live pool monitoring.",
      },
    },
    { userWallet: args.userWallet },
  );

  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "liquidity-drop" as AlertType,
    severity: riskToSeverity(exp.data.riskLevel),
    title: exp.data.title,
    explanation: exp.data.summary + `\n\nWhat to verify: ${exp.data.whatToVerify}`,
    confidence: exp.data.confidence,
    sourceType: "onchain",
    sourceUrl: explorerLink(args.network, "address", args.userWallet),
    metadata: {
      run: "liquidity-flow",
      latestBlock: block.number?.toString() ?? null,
      dataLimitations: exp.data.dataLimitations,
    },
    readAt: null,
  };
}

// --------------- Token Risk ----------------
async function runTokenRiskAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  const rpc = rpcFor(args.network);
  const block = await rpc.getBlock();

  const exp = await generateAlertExplanation(
    {
      alertType: "token-risk-scan",
      severity: "info",
      subject: { kind: "wallet", ref: args.userWallet },
      dataSource: "mantle-rpc",
      sourceData: {
        latestBlock: block.number?.toString() ?? null,
        note: "Full ownership-concentration scoring requires an indexer; this run reports baseline reachability so a real scan can be scheduled.",
      },
    },
    { userWallet: args.userWallet },
  );

  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "token-anomaly" as AlertType,
    severity: riskToSeverity(exp.data.riskLevel),
    title: exp.data.title,
    explanation: exp.data.summary + `\n\nWhat to verify: ${exp.data.whatToVerify}`,
    confidence: exp.data.confidence,
    sourceType: "onchain",
    sourceUrl: explorerLink(args.network, "address", args.userWallet),
    metadata: {
      run: "token-risk",
      latestBlock: block.number?.toString() ?? null,
      dataLimitations: exp.data.dataLimitations,
    },
    readAt: null,
  };
}

// --------------- Portfolio Risk ----------------
async function runPortfolioRiskAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  const rpc = rpcFor(args.network);
  const balance = await rpc.getBalance({ address: args.userWallet as Address });

  const exp = await generateAlertExplanation(
    {
      alertType: "portfolio-baseline",
      severity: "info",
      subject: { kind: "wallet", ref: args.userWallet },
      dataSource: "mantle-rpc",
      sourceData: {
        nativeBalanceWei: balance.toString(),
        nativeSymbol: "MNT",
        note: "Composite portfolio scoring requires per-token balance + price oracle integration; this run anchors the baseline.",
      },
    },
    { userWallet: args.userWallet },
  );

  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "portfolio-warning" as AlertType,
    severity: riskToSeverity(exp.data.riskLevel),
    title: exp.data.title,
    explanation: exp.data.summary + `\n\nWhat to verify: ${exp.data.whatToVerify}`,
    confidence: exp.data.confidence,
    sourceType: "onchain",
    sourceUrl: explorerLink(args.network, "address", args.userWallet),
    metadata: {
      run: "portfolio-risk",
      nativeBalanceWei: balance.toString(),
      dataLimitations: exp.data.dataLimitations,
    },
    readAt: null,
  };
}

// --------------- Reputation ----------------
async function runReputationAgent(args: {
  agent: Agent;
  userWallet: `0x${string}`;
  network: 5000 | 5003;
}): Promise<Omit<Alert, "id" | "createdAt">> {
  const exp = await generateAlertExplanation(
    {
      alertType: "agent-reputation-report",
      severity: "info",
      subject: { kind: "agent", ref: args.agent.slug },
      dataSource: "leapvault-reputation",
      sourceData: {
        agentName: args.agent.name,
        score: args.agent.reputation.score,
        totalTasks: args.agent.reputation.totalTasks,
        completedTasks: args.agent.reputation.completedTasks,
        usefulAlerts: args.agent.reputation.usefulAlertCount,
        falseAlerts: args.agent.reputation.falseAlertReports,
      },
    },
    { userWallet: args.userWallet },
  );

  return {
    taskId: null,
    agentId: args.agent.id,
    userWallet: args.userWallet,
    type: "risk-warning" as AlertType,
    severity: riskToSeverity(exp.data.riskLevel),
    title: exp.data.title,
    explanation: exp.data.summary,
    confidence: exp.data.confidence,
    sourceType: "agent",
    sourceUrl: null,
    metadata: {
      run: "reputation",
      agentSlug: args.agent.slug,
      dataLimitations: exp.data.dataLimitations,
    },
    readAt: null,
  };
}

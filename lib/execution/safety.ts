import "server-only";

import { err, ok, type ServiceResult } from "@/types/common";
import type {
  ExecutionModeConfig,
  ExecutionProposal,
  ExecutionProvider,
} from "./types";

/**
 * Hard rules around what we will and will not let through to a provider.
 *
 * Every rule has one reason: the user must remain in control. This module is
 * the single source of truth — every API route and adapter calls these helpers
 * before sending a payload anywhere.
 */

export function getExecutionMode(): ExecutionModeConfig {
  const mode = (process.env.EXECUTION_MODE ?? "approval_required").toLowerCase();
  const dryRunRaw = (process.env.EXECUTION_DRY_RUN ?? "true").toLowerCase();
  const timeout = Number.parseInt(process.env.EXECUTION_TIMEOUT_MS ?? "30000", 10);
  const retry = Number.parseInt(process.env.EXECUTION_RETRY_LIMIT ?? "1", 10);
  return {
    approvalRequired: mode === "approval_required",
    dryRun: dryRunRaw === "true" || dryRunRaw === "1",
    timeoutMs: Number.isFinite(timeout) ? timeout : 30000,
    retryLimit: Number.isFinite(retry) ? retry : 1,
  };
}

export function validateExecutionProposal(p: ExecutionProposal): ServiceResult<true> {
  if (!p.userWallet || !/^0x[a-fA-F0-9]{40}$/.test(p.userWallet)) {
    return err("validation", "Proposal is missing a valid wallet address.");
  }
  if (!p.agentId) return err("validation", "Proposal is missing the agent id.");
  if (!p.title || p.title.length < 3) {
    return err("validation", "Proposal title is required.");
  }
  if (!p.summary || p.summary.length < 3) {
    return err("validation", "Proposal summary is required.");
  }
  if (!p.actionType) return err("validation", "Proposal action type is required.");
  return ok(true);
}

export function requireUserApproval(p: ExecutionProposal): ServiceResult<true> {
  if (p.status !== "approved") {
    return err(
      "validation",
      "Execution requires user approval. Proposal must be in the `approved` state.",
    );
  }
  if (!p.userApprovedAt) {
    return err("validation", "Proposal has no recorded approval timestamp.");
  }
  return ok(true);
}

export function requireHighRiskConfirmation(
  p: ExecutionProposal,
  acknowledged: boolean,
): ServiceResult<true> {
  if (p.riskLevel === "high" && !acknowledged) {
    return err(
      "validation",
      "High-risk proposals require an explicit user acknowledgement before execution.",
    );
  }
  return ok(true);
}

export async function validateProviderConfigured(
  provider: ExecutionProvider,
): Promise<ServiceResult<true>> {
  try {
    const ready = await provider.isConfigured();
    if (!ready) {
      return err(
        "not-configured",
        `${provider.name} execution provider is not configured.`,
        "Add the provider's API key or CLI path in environment, then restart.",
      );
    }
    return ok(true);
  } catch (e) {
    return err("upstream", `Provider readiness check failed: ${(e as Error).message}`);
  }
}

export function blockUnsafeExecution(p: ExecutionProposal): ServiceResult<true> {
  const proposal = validateExecutionProposal(p);
  if (!proposal.ok) return proposal;
  const approval = requireUserApproval(p);
  if (!approval.ok) return approval;
  // monitor_only / risk_report are valid outcomes — they route to the manual
  // provider which records the approval and returns a clean dry-run result.
  // We only block them when a fund-moving provider was somehow selected.
  if (
    (p.actionType === "monitor_only" || p.actionType === "risk_report") &&
    p.provider !== "manual" &&
    p.provider !== "none"
  ) {
    return err(
      "validation",
      "Monitor-only and risk-report proposals must route to the manual provider.",
    );
  }
  return ok(true);
}

const ALLOWED_PARAM_KEYS = new Set([
  "tokenIn",
  "tokenOut",
  "amount",
  "amountIn",
  "amountOut",
  "minOut",
  "slippageBps",
  "poolAddress",
  "positionId",
  "lowerTick",
  "upperTick",
  "recipient",
  "deadline",
  "network",
  "memo",
  "strategy",
  "reason",
  "targetAddress",
  "targetSymbol",
]);

/**
 * Trim params down to a known allowlist. The router can extend the allowlist
 * per-provider — this is the conservative default and stops adapters from
 * accidentally forwarding unknown user-controlled keys to a shell or HTTP call.
 */
export function sanitizeExecutionParams(
  params: Record<string, unknown>,
  extraAllowed: Iterable<string> = [],
): Record<string, unknown> {
  const allow = new Set([...ALLOWED_PARAM_KEYS, ...extraAllowed]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (!allow.has(k)) continue;
    if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

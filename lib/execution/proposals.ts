import "server-only";

import type { Alert } from "@/types/alert";
import type { Agent, AgentCategory } from "@/types/agent";
import type {
  ExecutionActionType,
  ExecutionProposal,
  ExecutionProviderName,
  ExecutionRiskLevel,
} from "./types";

/**
 * Build a draft `ExecutionProposal` from an alert + agent.
 *
 * This is heuristic — we map alert types to plausible action types and let the
 * user adjust. Nothing is persisted here; the API route is responsible for
 * inserting the draft and moving it through the lifecycle.
 */

const ACTION_BY_AGENT_CATEGORY: Record<AgentCategory, ExecutionActionType> = {
  "smart-wallet": "monitor_only",
  whale: "monitor_only",
  "rwa-yield": "rebalance",
  "token-risk": "risk_report",
  liquidity: "open_lp_position",
  "portfolio-risk": "rebalance",
  reputation: "risk_report",
};

const RISK_BY_ALERT_SEVERITY: Record<Alert["severity"], ExecutionRiskLevel> = {
  info: "low",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "high",
};

export function defaultProviderForAction(
  action: ExecutionActionType,
): ExecutionProviderName {
  switch (action) {
    case "monitor_only":
    case "risk_report":
      return "manual";
    case "swap":
    case "rebalance":
      return resolveDefaultExecutionProvider();
    case "open_lp_position":
    case "close_lp_position":
    case "claim_rewards":
      return resolveDefaultExecutionProvider();
    default:
      return resolveDefaultExecutionProvider();
  }
}

export function resolveDefaultExecutionProvider(): ExecutionProviderName {
  const v = (process.env.EXECUTION_PROVIDER ?? "").toLowerCase();
  if (v === "realclaw") return "realclaw";
  if (v === "byreal") return "byreal";
  if (v === "manual") return "manual";
  // Fall back to whichever adapter is enabled.
  if ((process.env.REALCLAW_ENABLED ?? "").toLowerCase() === "true") return "realclaw";
  if ((process.env.BYREAL_SKILLS_ENABLED ?? "").toLowerCase() === "true") return "byreal";
  return "none";
}

export interface DraftProposalInput {
  alert: Alert;
  agent: Agent;
  userWallet: `0x${string}`;
  /** Override the heuristic action selection. */
  actionType?: ExecutionActionType;
  /** Override the heuristic provider selection. */
  provider?: ExecutionProviderName;
  /** User-supplied execution params (already validated upstream). */
  requestedParams?: Record<string, unknown>;
}

export function buildDraftProposal(
  input: DraftProposalInput,
): Omit<ExecutionProposal, "id" | "createdAt" | "updatedAt"> {
  const action = input.actionType ?? ACTION_BY_AGENT_CATEGORY[input.agent.category];
  const provider = input.provider ?? defaultProviderForAction(action);
  const risk = RISK_BY_ALERT_SEVERITY[input.alert.severity];

  return {
    userWallet: input.userWallet,
    agentId: input.agent.id,
    taskId: input.alert.taskId ?? null,
    alertId: input.alert.id,
    provider,
    actionType: action,
    title: titleFor(action, input.alert),
    summary: input.alert.title,
    rationale: input.alert.explanation,
    riskLevel: risk,
    confidence: input.alert.confidence,
    sourceData: {
      alertType: input.alert.type,
      sourceType: input.alert.sourceType,
      sourceUrl: input.alert.sourceUrl ?? null,
      metadata: input.alert.metadata ?? null,
    },
    requestedParams: input.requestedParams ?? {},
    status: "pending_approval",
    userApprovedAt: null,
    userRejectedAt: null,
  };
}

function titleFor(action: ExecutionActionType, alert: Alert): string {
  switch (action) {
    case "rebalance":
      return `Possible rebalance — ${alert.title}`;
    case "swap":
      return `Possible swap — ${alert.title}`;
    case "open_lp_position":
      return `LP position proposal — ${alert.title}`;
    case "close_lp_position":
      return `Close LP position — ${alert.title}`;
    case "claim_rewards":
      return `Claim rewards — ${alert.title}`;
    case "risk_report":
      return `Risk report — ${alert.title}`;
    case "monitor_only":
      return `Tighter monitoring — ${alert.title}`;
    default:
      return alert.title;
  }
}

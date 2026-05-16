/**
 * Execution Layer — types shared across execution providers, services, and UI.
 *
 * LeapVault's positioning: monitoring, explanation, and reputation. Execution
 * is delegated to optional providers (RealClaw / Byreal Agent Skills) and ALWAYS
 * routes through a user-approval gate. Nothing here can move user funds without
 * an explicit `approved` proposal status and a configured provider.
 */

export type ExecutionProviderName = "realclaw" | "byreal" | "manual" | "none";

export type ExecutionActionType =
  | "swap"
  | "rebalance"
  | "open_lp_position"
  | "close_lp_position"
  | "claim_rewards"
  | "monitor_only"
  | "risk_report"
  | "custom";

export type ExecutionProposalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "submitted"
  | "completed"
  | "failed";

export type ExecutionRiskLevel = "low" | "medium" | "high" | "unknown";

export interface ExecutionProposal {
  id: string;
  userWallet: `0x${string}`;
  agentId: string;
  taskId?: string | null;
  alertId?: string | null;
  provider: ExecutionProviderName;
  actionType: ExecutionActionType;
  title: string;
  summary: string;
  rationale: string;
  riskLevel: ExecutionRiskLevel;
  /** 0..1 model/source confidence. `null` for deterministic signals. */
  confidence: number | null;
  /** Verbatim subset of alert/task data the proposal was derived from. */
  sourceData: Record<string, unknown>;
  /** Parameters the provider needs to execute (e.g. tokenIn, tokenOut, amount). */
  requestedParams: Record<string, unknown>;
  status: ExecutionProposalStatus;
  userApprovedAt?: string | null;
  userRejectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionResult {
  proposalId: string;
  provider: ExecutionProviderName;
  status: "submitted" | "completed" | "failed";
  /** ONLY set when the provider reports a real on-chain transaction. */
  transactionHash?: string | null;
  externalExecutionId?: string | null;
  rawResponse?: unknown;
  errorMessage?: string | null;
  completedAt?: string | null;
  /** True when no real execution happened (provider unavailable / dry-run). */
  dryRun: boolean;
}

export interface ProviderHealth {
  provider: ExecutionProviderName;
  status: "online" | "degraded" | "offline" | "not-configured" | "unknown";
  latencyMs: number | null;
  message: string;
  checkedAt: string;
}

export interface ExecutionSimulationResult {
  available: boolean;
  estimatedImpact?: Record<string, unknown>;
  warnings?: string[];
  message?: string;
}

export interface ExecutionCapability {
  provider: ExecutionProviderName;
  actionType: ExecutionActionType;
  label: string;
  description: string;
  enabled: boolean;
  requiresApproval: boolean;
  /** False when capability is configured by env but not yet confirmed by provider. */
  verified: boolean;
}

export interface ExecutionProvider {
  readonly name: ExecutionProviderName;
  isConfigured(): Promise<boolean>;
  healthCheck(): Promise<ProviderHealth>;
  discoverCapabilities(): Promise<ExecutionCapability[]>;
  simulate?(proposal: ExecutionProposal): Promise<ExecutionSimulationResult>;
  execute(proposal: ExecutionProposal): Promise<ExecutionResult>;
}

export interface ExecutionLogEntry {
  id: string;
  proposalId: string;
  userWallet: `0x${string}`;
  provider: ExecutionProviderName;
  status: "submitted" | "completed" | "failed" | "dry_run";
  transactionHash: string | null;
  externalExecutionId: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ExecutionModeConfig {
  approvalRequired: boolean;
  dryRun: boolean;
  timeoutMs: number;
  retryLimit: number;
}

export const ACTION_TYPE_LABEL: Record<ExecutionActionType, string> = {
  swap: "Swap",
  rebalance: "Rebalance",
  open_lp_position: "Open LP Position",
  close_lp_position: "Close LP Position",
  claim_rewards: "Claim Rewards",
  monitor_only: "Monitor Only",
  risk_report: "Risk Report",
  custom: "Custom Action",
};

export const PROVIDER_LABEL: Record<ExecutionProviderName, string> = {
  realclaw: "RealClaw",
  byreal: "Byreal Skills",
  manual: "Manual",
  none: "None",
};

export const RISK_LEVEL_LABEL: Record<ExecutionRiskLevel, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  unknown: "Risk unknown",
};

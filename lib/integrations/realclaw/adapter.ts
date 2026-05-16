import "server-only";

import type {
  ExecutionCapability,
  ExecutionProposal,
  ExecutionProvider,
  ExecutionProviderName,
  ExecutionResult,
  ExecutionSimulationResult,
  ProviderHealth,
} from "@/lib/execution/types";
import { isRealClawConfigured, readRealClawConfig, realClawSubmit } from "./client";
import { getRealClawHealth } from "./health";

const CAPABILITIES: Array<Omit<ExecutionCapability, "verified" | "enabled">> = [
  {
    provider: "realclaw",
    actionType: "swap",
    label: "Swap",
    description: "Route an approved swap through RealClaw on the user's behalf.",
    requiresApproval: true,
  },
  {
    provider: "realclaw",
    actionType: "rebalance",
    label: "Rebalance",
    description: "Submit a multi-step rebalance plan after user approval.",
    requiresApproval: true,
  },
  {
    provider: "realclaw",
    actionType: "claim_rewards",
    label: "Claim rewards",
    description: "Submit a rewards-claim transaction approved by the user.",
    requiresApproval: true,
  },
  {
    provider: "realclaw",
    actionType: "open_lp_position",
    label: "Open LP position",
    description: "Open an LP position with approved tokens and range.",
    requiresApproval: true,
  },
  {
    provider: "realclaw",
    actionType: "close_lp_position",
    label: "Close LP position",
    description: "Close an existing LP position after approval.",
    requiresApproval: true,
  },
];

export function createRealClawAdapter(): ExecutionProvider {
  const name: ExecutionProviderName = "realclaw";
  return {
    name,
    async isConfigured(): Promise<boolean> {
      return isRealClawConfigured();
    },
    async healthCheck(): Promise<ProviderHealth> {
      return getRealClawHealth();
    },
    async discoverCapabilities(): Promise<ExecutionCapability[]> {
      const configured = isRealClawConfigured();
      return CAPABILITIES.map((c) => ({
        ...c,
        enabled: configured,
        // TODO: query RealClaw's capability endpoint once formalized; until then
        // we report "unverified" so the UI can label it as configured-but-untested.
        verified: false,
      }));
    },
    async simulate(_proposal: ExecutionProposal): Promise<ExecutionSimulationResult> {
      return {
        available: false,
        message: "RealClaw simulation endpoint not yet wired. Approve to run live.",
      };
    },
    async execute(proposal: ExecutionProposal): Promise<ExecutionResult> {
      if (!isRealClawConfigured()) {
        return {
          proposalId: proposal.id,
          provider: name,
          status: "failed",
          transactionHash: null,
          externalExecutionId: null,
          errorMessage: "RealClaw is not configured.",
          completedAt: new Date().toISOString(),
          dryRun: true,
        };
      }
      const cfg = readRealClawConfig();
      try {
        const resp = await realClawSubmit(
          {
            proposalId: proposal.id,
            userWallet: proposal.userWallet,
            actionType: proposal.actionType,
            params: proposal.requestedParams,
            metadata: {
              agentId: proposal.agentId,
              taskId: proposal.taskId ?? null,
              alertId: proposal.alertId ?? null,
              riskLevel: proposal.riskLevel,
            },
          },
          cfg,
        );
        const status: ExecutionResult["status"] =
          resp.status === "completed"
            ? "completed"
            : resp.status === "submitted"
              ? "submitted"
              : "failed";
        return {
          proposalId: proposal.id,
          provider: name,
          status,
          transactionHash: typeof resp.transactionHash === "string" ? resp.transactionHash : null,
          externalExecutionId: typeof resp.executionId === "string" ? resp.executionId : null,
          rawResponse: resp,
          errorMessage: resp.error ?? null,
          completedAt: new Date().toISOString(),
          dryRun: false,
        };
      } catch (e) {
        return {
          proposalId: proposal.id,
          provider: name,
          status: "failed",
          transactionHash: null,
          externalExecutionId: null,
          errorMessage: (e as Error).message,
          completedAt: new Date().toISOString(),
          dryRun: false,
        };
      }
    },
  };
}

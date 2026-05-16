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
import { BYREAL_COMMAND_TEMPLATES, findTemplateForAction } from "./capabilities";
import { byrealHealthCheck, isByrealConfigured, runByrealCommand } from "./cli";

export function createByrealAdapter(): ExecutionProvider {
  const name: ExecutionProviderName = "byreal";
  return {
    name,
    async isConfigured(): Promise<boolean> {
      return isByrealConfigured();
    },
    async healthCheck(): Promise<ProviderHealth> {
      const checkedAt = new Date().toISOString();
      if (!isByrealConfigured()) {
        return {
          provider: name,
          status: "not-configured",
          latencyMs: null,
          message: "Byreal Skills CLI is not configured.",
          checkedAt,
        };
      }
      const probe = await byrealHealthCheck();
      return {
        provider: name,
        status: probe.ok ? "online" : "offline",
        latencyMs: probe.latencyMs,
        message: probe.message,
        checkedAt,
      };
    },
    async discoverCapabilities(): Promise<ExecutionCapability[]> {
      const configured = isByrealConfigured();
      return BYREAL_COMMAND_TEMPLATES.filter((t) => t.actionType !== "discover").map((t) => ({
        provider: name,
        actionType: t.actionType as ExecutionCapability["actionType"],
        label: t.command,
        description: t.description,
        enabled: configured,
        requiresApproval: true,
        verified: false,
      }));
    },
    async simulate(_proposal: ExecutionProposal): Promise<ExecutionSimulationResult> {
      return {
        available: false,
        message: "Byreal simulate is not yet exposed via CLI. Approve to dry-run or execute live.",
      };
    },
    async execute(proposal: ExecutionProposal): Promise<ExecutionResult> {
      if (!isByrealConfigured()) {
        return {
          proposalId: proposal.id,
          provider: name,
          status: "failed",
          transactionHash: null,
          externalExecutionId: null,
          errorMessage: "Byreal Skills CLI is not configured.",
          completedAt: new Date().toISOString(),
          dryRun: true,
        };
      }
      const template = findTemplateForAction(proposal.actionType);
      if (!template) {
        return {
          proposalId: proposal.id,
          provider: name,
          status: "failed",
          transactionHash: null,
          externalExecutionId: null,
          errorMessage: `Byreal does not support action: ${proposal.actionType}`,
          completedAt: new Date().toISOString(),
          dryRun: false,
        };
      }
      const result = await runByrealCommand({
        command: template.command,
        params: proposal.requestedParams,
      });
      const ok = result.ok;
      const parsed = (result.parsed ?? {}) as Record<string, unknown>;
      return {
        proposalId: proposal.id,
        provider: name,
        status: ok ? "completed" : "failed",
        transactionHash:
          typeof parsed.transactionHash === "string" ? (parsed.transactionHash as string) : null,
        externalExecutionId:
          typeof parsed.executionId === "string" ? (parsed.executionId as string) : null,
        rawResponse: result.parsed ?? { stdout: result.rawStdout, stderr: result.rawStderr },
        errorMessage: ok ? null : result.errorMessage,
        completedAt: new Date().toISOString(),
        dryRun: false,
      };
    },
  };
}

import "server-only";

import type {
  ExecutionCapability,
  ExecutionProposal,
  ExecutionProvider,
  ExecutionProviderName,
  ExecutionResult,
  ExecutionSimulationResult,
  ProviderHealth,
} from "./types";

/**
 * Manual provider — represents "no execution, route to the user dashboard".
 *
 * It is always considered configured. Calling `execute()` returns a structured
 * dry-run-style result with `dryRun: true`. The UI uses this when the user
 * chooses "monitor only" or when no real provider is enabled.
 */
class ManualProvider implements ExecutionProvider {
  readonly name: ExecutionProviderName = "manual";

  async isConfigured(): Promise<boolean> {
    return true;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: "manual",
      status: "online",
      latencyMs: 0,
      message: "Manual review — no external execution.",
      checkedAt: new Date().toISOString(),
    };
  }

  async discoverCapabilities(): Promise<ExecutionCapability[]> {
    return [
      {
        provider: "manual",
        actionType: "monitor_only",
        label: "Monitor only",
        description: "Keep watching this signal; no transaction is sent.",
        enabled: true,
        requiresApproval: true,
        verified: true,
      },
      {
        provider: "manual",
        actionType: "risk_report",
        label: "Risk report",
        description: "Generate a structured risk summary for the user dashboard.",
        enabled: true,
        requiresApproval: true,
        verified: true,
      },
    ];
  }

  async simulate(_proposal: ExecutionProposal): Promise<ExecutionSimulationResult> {
    return {
      available: true,
      message: "Manual review proposal — no on-chain simulation needed.",
    };
  }

  async execute(proposal: ExecutionProposal): Promise<ExecutionResult> {
    return {
      proposalId: proposal.id,
      provider: "manual",
      status: "completed",
      transactionHash: null,
      externalExecutionId: null,
      rawResponse: { message: "Manual proposal recorded; no external call made." },
      errorMessage: null,
      completedAt: new Date().toISOString(),
      dryRun: true,
    };
  }
}

/**
 * "None" — placeholder when no provider is selected at all. Always blocks
 * execution but reports cleanly in the UI.
 */
class NoneProvider implements ExecutionProvider {
  readonly name: ExecutionProviderName = "none";

  async isConfigured(): Promise<boolean> {
    return false;
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      provider: "none",
      status: "not-configured",
      latencyMs: null,
      message: "No execution provider selected.",
      checkedAt: new Date().toISOString(),
    };
  }

  async discoverCapabilities(): Promise<ExecutionCapability[]> {
    return [];
  }

  async execute(proposal: ExecutionProposal): Promise<ExecutionResult> {
    return {
      proposalId: proposal.id,
      provider: "none",
      status: "failed",
      transactionHash: null,
      externalExecutionId: null,
      errorMessage: "No execution provider configured.",
      completedAt: new Date().toISOString(),
      dryRun: true,
    };
  }
}

let manual: ExecutionProvider | null = null;
let none: ExecutionProvider | null = null;
let realclaw: ExecutionProvider | null = null;
let byreal: ExecutionProvider | null = null;

export function getManualProvider(): ExecutionProvider {
  if (!manual) manual = new ManualProvider();
  return manual;
}

export function getNoneProvider(): ExecutionProvider {
  if (!none) none = new NoneProvider();
  return none;
}

export function getRealClawProvider(): ExecutionProvider {
  if (realclaw) return realclaw;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/lib/integrations/realclaw/adapter") as typeof import("@/lib/integrations/realclaw/adapter");
  realclaw = mod.createRealClawAdapter();
  return realclaw;
}

export function getByrealProvider(): ExecutionProvider {
  if (byreal) return byreal;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@/lib/integrations/byreal/adapter") as typeof import("@/lib/integrations/byreal/adapter");
  byreal = mod.createByrealAdapter();
  return byreal;
}

export function getProvider(name: ExecutionProviderName): ExecutionProvider {
  switch (name) {
    case "realclaw":
      return getRealClawProvider();
    case "byreal":
      return getByrealProvider();
    case "manual":
      return getManualProvider();
    case "none":
      return getNoneProvider();
  }
}

export function listAllProviders(): ExecutionProvider[] {
  return [getRealClawProvider(), getByrealProvider(), getManualProvider()];
}

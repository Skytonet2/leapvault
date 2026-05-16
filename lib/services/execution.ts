import "server-only";

import { err, ok, type ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";
import { buildDraftProposal } from "@/lib/execution/proposals";
import { routeApprovedProposal } from "@/lib/execution/router";
import { listAllProviders, getProvider } from "@/lib/execution/provider";
import {
  getExecutionMode,
} from "@/lib/execution/safety";
import {
  onProposalApproved,
  onProposalCreated,
  onProposalRejected,
} from "@/lib/services/reputation-events";
import type {
  ExecutionCapability,
  ExecutionLogEntry,
  ExecutionProposal,
  ExecutionResult,
  ProviderHealth,
} from "@/lib/execution/types";

function notConfigured<T>(hint?: string): ServiceResult<T> {
  return err(
    "not-configured",
    "Execution backend is not configured.",
    hint ?? "Set DATABASE_URL and configure RealClaw / Byreal Skills.",
  );
}

export async function createProposalFromAlert(input: {
  alertId: string;
  userWallet: `0x${string}`;
  /** Optional overrides set by the user in the approval modal. */
  actionType?: import("@/lib/execution/types").ExecutionActionType;
  provider?: import("@/lib/execution/types").ExecutionProviderName;
  requestedParams?: Record<string, unknown>;
}): Promise<ServiceResult<ExecutionProposal>> {
  const db = getDb();
  if (!db.getAlertById || !db.insertExecutionProposal) return notConfigured();

  const alertRes = await db.getAlertById(input.alertId, input.userWallet);
  if (!alertRes.ok) return alertRes;
  const alert = alertRes.data;

  if (!alert.agentId) {
    return err("validation", "Alert is not associated with an agent.");
  }
  const agents = await db.listAgents();
  if (!agents.ok) return agents;
  const agent = agents.data.find((a) => a.id === alert.agentId);
  if (!agent) return err("not-found", "Agent for this alert was not found.");

  const draft = buildDraftProposal({
    alert,
    agent,
    userWallet: input.userWallet,
    actionType: input.actionType,
    provider: input.provider,
    requestedParams: input.requestedParams,
  });
  const inserted = await db.insertExecutionProposal(draft);
  if (inserted.ok) {
    await onProposalCreated(agent.id);
  }
  return inserted;
}

export async function listUserProposals(
  userWallet: `0x${string}`,
): Promise<ServiceResult<ExecutionProposal[]>> {
  const db = getDb();
  if (!db.listUserExecutionProposals) return notConfigured();
  return db.listUserExecutionProposals(userWallet);
}

export async function getProposal(
  id: string,
  userWallet: `0x${string}`,
): Promise<ServiceResult<ExecutionProposal>> {
  const db = getDb();
  if (!db.getExecutionProposalById) return notConfigured();
  return db.getExecutionProposalById(id, userWallet);
}

export async function approveAndExecuteProposal(input: {
  id: string;
  userWallet: `0x${string}`;
  highRiskAcknowledged?: boolean;
}): Promise<ServiceResult<{ proposal: ExecutionProposal; result: ExecutionResult }>> {
  const db = getDb();
  if (!db.approveExecutionProposal) return notConfigured();

  const approved = await db.approveExecutionProposal(input.id, input.userWallet);
  if (!approved.ok) return approved;
  await onProposalApproved(approved.data.agentId);

  const routed = await routeApprovedProposal({
    proposal: approved.data,
    highRiskAcknowledged: input.highRiskAcknowledged,
  });
  if (!routed.ok) return routed;

  // Re-read to surface the updated status.
  const refreshed = db.getExecutionProposalById
    ? await db.getExecutionProposalById(input.id, input.userWallet)
    : ok(approved.data);
  const finalProposal = refreshed.ok ? refreshed.data : approved.data;

  return ok({ proposal: finalProposal, result: routed.data });
}

export async function rejectProposal(
  id: string,
  userWallet: `0x${string}`,
): Promise<ServiceResult<ExecutionProposal>> {
  const db = getDb();
  if (!db.rejectExecutionProposal) return notConfigured();
  const result = await db.rejectExecutionProposal(id, userWallet);
  if (result.ok) {
    await onProposalRejected(result.data.agentId);
  }
  return result;
}

export async function getProposalLogs(
  proposalId: string,
  userWallet: `0x${string}`,
): Promise<ServiceResult<ExecutionLogEntry[]>> {
  const db = getDb();
  if (!db.getExecutionProposalById || !db.listExecutionLogsForProposal) return notConfigured();
  const owns = await db.getExecutionProposalById(proposalId, userWallet);
  if (!owns.ok) return owns;
  return db.listExecutionLogsForProposal(proposalId);
}

export async function getProviderStatuses(): Promise<{
  mode: ReturnType<typeof getExecutionMode>;
  defaultProvider: string;
  providers: Array<{ health: ProviderHealth; capabilities: ExecutionCapability[] }>;
}> {
  const providers = listAllProviders();
  const out: Array<{ health: ProviderHealth; capabilities: ExecutionCapability[] }> = [];
  for (const p of providers) {
    const [health, capabilities] = await Promise.all([
      p.healthCheck(),
      p.discoverCapabilities(),
    ]);
    out.push({ health, capabilities });
  }
  return {
    mode: getExecutionMode(),
    defaultProvider: (process.env.EXECUTION_PROVIDER ?? "manual").toLowerCase(),
    providers: out,
  };
}

export async function getProviderHealthOnly(
  provider: import("@/lib/execution/types").ExecutionProviderName,
): Promise<ProviderHealth> {
  return getProvider(provider).healthCheck();
}

export async function getAgentCapabilities(
  agentId: string,
): Promise<ServiceResult<Array<{ provider: string; actionType: string; enabled: boolean; requiresApproval: boolean }>>> {
  const db = getDb();
  if (!db.listAgentExecutionCapabilities) return notConfigured();
  return db.listAgentExecutionCapabilities(agentId);
}

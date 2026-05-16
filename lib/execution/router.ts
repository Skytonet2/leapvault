import "server-only";

import { err, ok, type ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";
import type {
  ExecutionLogEntry,
  ExecutionProposal,
  ExecutionResult,
} from "./types";
import {
  blockUnsafeExecution,
  getExecutionMode,
  requireHighRiskConfirmation,
  sanitizeExecutionParams,
  validateProviderConfigured,
} from "./safety";
import { buildLogEntry } from "./audit";
import { getProvider } from "./provider";
import {
  onExecutionCompleted,
  onExecutionFailed,
} from "@/lib/services/reputation-events";

/**
 * Top-level entry point used by /api/execution/approve.
 *
 * Flow:
 * 1. Validate proposal shape, ownership, and approval state.
 * 2. Resolve the provider; if not configured -> structured error.
 * 3. Apply mode rules (dry-run forces a manual no-op execution).
 * 4. Sanitize params, hand off to provider.
 * 5. Persist log entry, update proposal status, return result.
 */
export async function routeApprovedProposal(input: {
  proposal: ExecutionProposal;
  highRiskAcknowledged?: boolean;
}): Promise<ServiceResult<ExecutionResult>> {
  const { proposal } = input;

  const safety = blockUnsafeExecution(proposal);
  if (!safety.ok) return safety;

  const risk = requireHighRiskConfirmation(proposal, input.highRiskAcknowledged ?? false);
  if (!risk.ok) return risk;

  const mode = getExecutionMode();

  // Sanitize params on the way in.
  const sanitized = sanitizeExecutionParams(proposal.requestedParams);
  const sanitizedProposal: ExecutionProposal = {
    ...proposal,
    requestedParams: sanitized,
  };

  const provider = getProvider(proposal.provider);
  const configured = await validateProviderConfigured(provider);

  // Dry-run mode: skip the provider call but persist a `dry_run` log entry.
  if (mode.dryRun) {
    const result: ExecutionResult = {
      proposalId: proposal.id,
      provider: proposal.provider,
      status: "completed",
      transactionHash: null,
      externalExecutionId: null,
      rawResponse: { dryRun: true, providerConfigured: configured.ok },
      errorMessage: null,
      completedAt: new Date().toISOString(),
      dryRun: true,
    };
    await persistLog(sanitizedProposal, result, "dry_run");
    await markProposalStatus(proposal.id, "completed");
    await onExecutionCompleted(proposal.agentId, true);
    return ok(result);
  }

  if (!configured.ok) {
    await persistLog(sanitizedProposal, null, "failed", configured.error.message);
    await markProposalStatus(proposal.id, "failed");
    await onExecutionFailed(proposal.agentId);
    return configured;
  }

  let result: ExecutionResult;
  try {
    result = await provider.execute(sanitizedProposal);
  } catch (e) {
    const message = (e as Error).message || "Unknown provider error.";
    await persistLog(sanitizedProposal, null, "failed", message);
    await markProposalStatus(proposal.id, "failed");
    await onExecutionFailed(proposal.agentId);
    return err("upstream", `Execution failed: ${message}`);
  }

  await persistLog(sanitizedProposal, result, result.status === "failed" ? "failed" : result.status);
  await markProposalStatus(proposal.id, result.status);
  if (result.status === "failed") {
    await onExecutionFailed(proposal.agentId);
  } else {
    await onExecutionCompleted(proposal.agentId, result.dryRun);
  }

  return ok(result);
}

async function persistLog(
  proposal: ExecutionProposal,
  result: ExecutionResult | null,
  status: ExecutionLogEntry["status"],
  errorMessage?: string,
): Promise<void> {
  const db = getDb();
  if (!db.insertExecutionLog) return;
  const entry = buildLogEntry({
    proposalId: proposal.id,
    userWallet: proposal.userWallet,
    provider: proposal.provider,
    status,
    transactionHash: result?.transactionHash ?? null,
    externalExecutionId: result?.externalExecutionId ?? null,
    requestPayload: {
      actionType: proposal.actionType,
      requestedParams: proposal.requestedParams,
      title: proposal.title,
    },
    responsePayload: result
      ? ({ raw: result.rawResponse ?? null, status: result.status, dryRun: result.dryRun } as Record<string, unknown>)
      : null,
    errorMessage: errorMessage ?? result?.errorMessage ?? null,
  });
  try {
    await db.insertExecutionLog(entry);
  } catch {
    // Logging failure should not bubble up — we already have a result.
  }
}

async function markProposalStatus(
  id: string,
  status: ExecutionProposal["status"],
): Promise<void> {
  const db = getDb();
  if (!db.updateExecutionProposalStatus) return;
  try {
    await db.updateExecutionProposalStatus(id, status);
  } catch {
    /* swallow */
  }
}

import "server-only";

import { getDb } from "@/lib/database/client";
import { anchorReputation } from "@/lib/contracts/anchor";
import { contractsConfigured } from "@/lib/contracts/network";

/**
 * Reputation event sinks.
 *
 * Every event mutates the agent's counters and recomputes its composite score
 * atomically. The score formula lives in `recomputeAgentReputationScore` on
 * the Postgres adapter so the calculation is consistent server-side:
 *
 *   score = clamp(
 *     50
 *     + (usefulAlerts - falseAlerts) * 3
 *     + executionsCompleted * 2
 *     - executionsFailed * 4
 *     + min(proposalsApproved, 10) * 1
 *     - min(proposalsRejected, 10) * 0.5,
 *     0, 100
 *   )
 *
 * Notes:
 * - These helpers never throw. Reputation accounting failing must not break
 *   the user's request — at worst the dashboard is one event stale.
 * - Dry-run executions still count as `executionsCompleted` because the agent
 *   did real reasoning + the user approved a real proposal; only the on-chain
 *   send was skipped.
 * - After the DB recompute we attempt a best-effort on-chain anchor write to
 *   ReputationRegistry. The anchor service has its own timeout + error
 *   swallowing so this loop never delays the user's request by more than
 *   ~25s in the worst case.
 */

async function anchorIfPossible(agentId: string): Promise<void> {
  if (!contractsConfigured()) return;
  const db = getDb();
  if (!db.getAgentReputationSnapshot || !db.setAgentReputationAnchor) return;
  try {
    const snap = await db.getAgentReputationSnapshot(agentId);
    if (!snap.ok) return;
    const result = await anchorReputation({
      agentSlug: snap.data.slug,
      score: snap.data.score,
      alertCount: snap.data.alertCount,
      proposalCount: snap.data.proposalCount,
      executionCount: snap.data.executionCount,
      breakdown: snap.data.breakdown,
    });
    if (result.ok) {
      await db.setAgentReputationAnchor(agentId, result.txHash);
    }
  } catch {
    /* anchor is best-effort */
  }
}

async function safeBump(
  agentId: string | null | undefined,
  deltas: Parameters<NonNullable<ReturnType<typeof getDb>["bumpAgentReputation"]>>[1],
): Promise<void> {
  if (!agentId) return;
  const db = getDb();
  if (!db.bumpAgentReputation) return;
  try {
    await db.bumpAgentReputation(agentId, deltas);
    if (db.recomputeAgentReputationScore) {
      await db.recomputeAgentReputationScore(agentId);
    }
    await anchorIfPossible(agentId);
  } catch {
    /* swallow — reputation accounting is best-effort */
  }
}

export async function onProposalCreated(agentId: string | null | undefined): Promise<void> {
  await safeBump(agentId, { proposalsCreated: 1 });
}

export async function onProposalApproved(agentId: string | null | undefined): Promise<void> {
  await safeBump(agentId, { proposalsApproved: 1 });
}

export async function onProposalRejected(agentId: string | null | undefined): Promise<void> {
  await safeBump(agentId, { proposalsRejected: 1 });
}

export async function onExecutionCompleted(
  agentId: string | null | undefined,
  _dryRun: boolean,
): Promise<void> {
  // Both real and dry-run completions count — the agent did the work; the user
  // approved. Dry-run is intentional for safety, not a defect.
  await safeBump(agentId, { executionsCompleted: 1 });
}

export async function onExecutionFailed(agentId: string | null | undefined): Promise<void> {
  await safeBump(agentId, { executionsFailed: 1 });
}

export async function onUsefulAlert(agentId: string | null | undefined): Promise<void> {
  await safeBump(agentId, { usefulAlertCount: 1 });
}

export async function onFalseAlertReport(agentId: string | null | undefined): Promise<void> {
  await safeBump(agentId, { falseAlertReports: 1 });
}

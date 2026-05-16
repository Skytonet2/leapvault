import "server-only";

import type { AgentReputation } from "@/types/agent";
import type { ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";

export async function getAgentReputation(
  agentId: string,
): Promise<ServiceResult<AgentReputation>> {
  const db = getDb();
  const all = await db.listAgents();
  if (!all.ok) return all;
  const agent = all.data.find((a) => a.id === agentId);
  if (!agent) {
    return { ok: false, error: { kind: "not-found", message: "Agent not found." } };
  }
  return { ok: true, data: agent.reputation };
}

/**
 * Reputation update is a server-authoritative action driven by signed proofs of
 * task outcomes. In MVP this is a stub — real implementation will:
 *   1. Verify the proof payload signature.
 *   2. Apply weighted update to user rating average, false-alert ratio, etc.
 *   3. Optionally write the new score's hash via ReputationRegistry.
 */
export async function updateAgentReputation(_input: {
  agentId: string;
  delta: { useful?: number; falseAlert?: number; rating?: number };
}): Promise<ServiceResult<AgentReputation>> {
  return {
    ok: false,
    error: {
      kind: "not-configured",
      message: "Reputation updates require a server-signed task-outcome flow.",
      hint: "Implement updateAgentReputation in lib/services/reputation.ts.",
    },
  };
}

/**
 * Composite reputation score. Returns `null` when there is not enough activity
 * to be meaningful. Keeps the UI honest.
 */
export function computeReputationScore(input: {
  completedTasks: number;
  totalTasks: number;
  userRatingAverage: number | null;
  usefulAlertCount: number;
  falseAlertReports: number;
}): number | null {
  if (input.completedTasks < 3) return null;
  const completionRate = input.completedTasks / Math.max(1, input.totalTasks);
  const usefulnessRatio =
    input.usefulAlertCount /
    Math.max(1, input.usefulAlertCount + input.falseAlertReports);
  const rating = (input.userRatingAverage ?? 0) / 5;
  const score = completionRate * 0.4 + usefulnessRatio * 0.4 + rating * 0.2;
  return Math.round(score * 100);
}

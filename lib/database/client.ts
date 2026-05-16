import "server-only";

/**
 * Database adapter is intentionally unimplemented in MVP scaffolding.
 *
 * Services call `getDb()` and degrade gracefully when DATABASE_URL is unset,
 * returning structured "not-configured" errors so the UI can render setup
 * empty states instead of silent fake data.
 *
 * To wire a real database (Supabase / Postgres):
 *   1. `npm i postgres` (or `@supabase/supabase-js`).
 *   2. Replace `createNotConfiguredDb` with a real client factory.
 *   3. Implement the adapter methods on `DatabaseAdapter`.
 */

import type { Agent } from "@/types/agent";
import type { Alert } from "@/types/alert";
import type { RwaAsset } from "@/types/rwa";
import type { Task } from "@/types/task";
import type { ServiceResult } from "@/types/common";
import { err } from "@/types/common";
import type {
  ExecutionLogEntry,
  ExecutionProposal,
  ExecutionProposalStatus,
} from "@/lib/execution/types";

export interface AgentExecutionCapabilityRow {
  agentId: string;
  provider: string;
  actionType: string;
  enabled: boolean;
  requiresApproval: boolean;
}

export interface DatabaseAdapter {
  listAgents(filters?: { category?: string }): Promise<ServiceResult<Agent[]>>;
  getAgentBySlug(slug: string): Promise<ServiceResult<Agent>>;
  listUserTasks(userWallet: `0x${string}`): Promise<ServiceResult<Task[]>>;
  insertTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<ServiceResult<Task>>;
  listUserAlerts(userWallet: `0x${string}`): Promise<ServiceResult<Alert[]>>;
  getAlertById?(alertId: string, userWallet: `0x${string}`): Promise<ServiceResult<Alert>>;
  markAlertRead(alertId: string, userWallet: `0x${string}`): Promise<ServiceResult<Alert>>;
  insertAlert?(alert: Omit<Alert, "id" | "createdAt">): Promise<ServiceResult<Alert>>;
  listRwaAssets(): Promise<ServiceResult<RwaAsset[]>>;
  getRwaAssetByAddress(address: `0x${string}`): Promise<ServiceResult<RwaAsset>>;
  upsertRwaAsset?(
    asset: Omit<RwaAsset, "id" | "activeMonitoringAgentIds">,
  ): Promise<ServiceResult<RwaAsset>>;

  // Execution layer — optional; adapters that don't implement these degrade
  // to "not-configured" so unconfigured environments still render cleanly.
  insertExecutionProposal?(
    proposal: Omit<ExecutionProposal, "id" | "createdAt" | "updatedAt">,
  ): Promise<ServiceResult<ExecutionProposal>>;
  listUserExecutionProposals?(
    userWallet: `0x${string}`,
  ): Promise<ServiceResult<ExecutionProposal[]>>;
  getExecutionProposalById?(
    id: string,
    userWallet: `0x${string}`,
  ): Promise<ServiceResult<ExecutionProposal>>;
  updateExecutionProposalStatus?(
    id: string,
    status: ExecutionProposalStatus,
  ): Promise<ServiceResult<ExecutionProposal>>;
  approveExecutionProposal?(
    id: string,
    userWallet: `0x${string}`,
  ): Promise<ServiceResult<ExecutionProposal>>;
  rejectExecutionProposal?(
    id: string,
    userWallet: `0x${string}`,
  ): Promise<ServiceResult<ExecutionProposal>>;
  insertExecutionLog?(
    entry: Omit<ExecutionLogEntry, "id" | "createdAt">,
  ): Promise<ServiceResult<ExecutionLogEntry>>;
  listExecutionLogsForProposal?(
    proposalId: string,
  ): Promise<ServiceResult<ExecutionLogEntry[]>>;
  listAgentExecutionCapabilities?(
    agentId: string,
  ): Promise<ServiceResult<AgentExecutionCapabilityRow[]>>;

  /**
   * Atomic counter bumps on `agent_reputation`. Each numeric field is a delta
   * (positive or negative). Missing fields are treated as 0. The DB ensures
   * the row exists by upserting from defaults if needed.
   */
  bumpAgentReputation?(
    agentId: string,
    deltas: Partial<{
      proposalsCreated: number;
      proposalsApproved: number;
      proposalsRejected: number;
      executionsCompleted: number;
      executionsFailed: number;
      usefulAlertCount: number;
      falseAlertReports: number;
    }>,
  ): Promise<ServiceResult<true>>;

  /**
   * Recompute the composite `score` column from the existing counter values.
   * Done as a single UPDATE so the calculation is consistent on the server side.
   */
  recomputeAgentReputationScore?(agentId: string): Promise<ServiceResult<true>>;

  /**
   * Snapshot of the reputation counters + slug used by the on-chain anchor
   * service. One query so the anchor call stays cheap on every event.
   */
  getAgentReputationSnapshot?(agentId: string): Promise<
    ServiceResult<{
      slug: string;
      score: number;
      alertCount: number;
      proposalCount: number;
      executionCount: number;
      breakdown: Record<string, number>;
    }>
  >;

  /**
   * Records the transaction hash of the latest on-chain anchor.
   */
  setAgentReputationAnchor?(
    agentId: string,
    txHash: string,
  ): Promise<ServiceResult<true>>;

  // ---------- Telegram bindings ----------
  createTelegramBindingCode?(
    wallet: `0x${string}`,
    code: string,
    ttlMs: number,
  ): Promise<ServiceResult<true>>;

  consumeTelegramBindingCode?(
    code: string,
  ): Promise<ServiceResult<`0x${string}` | null>>;

  saveTelegramBinding?(binding: {
    wallet: `0x${string}`;
    chatId: number;
    username?: string;
    firstName?: string;
  }): Promise<ServiceResult<true>>;

  getTelegramBindingByWallet?(
    wallet: `0x${string}`,
  ): Promise<
    ServiceResult<{
      wallet: `0x${string}`;
      chatId: number;
      username?: string;
      firstName?: string;
      createdAt: number;
    } | null>
  >;

  removeTelegramBinding?(
    wallet: `0x${string}`,
  ): Promise<ServiceResult<boolean>>;
}

function createNotConfiguredDb(): DatabaseAdapter {
  const fail = <T>() =>
    Promise.resolve(
      err(
        "not-configured",
        "Database is not configured.",
        "Set DATABASE_URL in your environment and implement lib/database/client.ts.",
      ) as ServiceResult<T>,
    );

  return {
    listAgents: () => fail(),
    getAgentBySlug: () => fail(),
    listUserTasks: () => fail(),
    insertTask: () => fail(),
    listUserAlerts: () => fail(),
    markAlertRead: () => fail(),
    listRwaAssets: () => fail(),
    getRwaAssetByAddress: () => fail(),
  };
}

let cached: DatabaseAdapter | null = null;

export function getDb(): DatabaseAdapter {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (url && /^postgres(ql)?:\/\//.test(url)) {
    // Lazy require so the `postgres` package isn't pulled into bundles when
    // DATABASE_URL is unset (e.g. local dev with empty env).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createPostgresAdapter } = require("./postgres") as typeof import("./postgres");
    cached = createPostgresAdapter();
    return cached;
  }
  cached = createNotConfiguredDb();
  return cached;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

import "server-only";
import postgres from "postgres";
import type { Sql } from "postgres";

import type { Agent } from "@/types/agent";
import type { Alert } from "@/types/alert";
import type { RwaAsset } from "@/types/rwa";
import type { Task } from "@/types/task";
import type { ServiceResult } from "@/types/common";
import { err, ok } from "@/types/common";
import type { AgentExecutionCapabilityRow, DatabaseAdapter } from "./client";
import type {
  ExecutionLogEntry,
  ExecutionProposal,
  ExecutionProposalStatus,
  ExecutionProviderName,
  ExecutionRiskLevel,
  ExecutionActionType,
} from "@/lib/execution/types";

let sql: Sql | null = null;

/**
 * Lazy postgres client. We instantiate on first call so dev/preview builds
 * without `DATABASE_URL` still produce a usable, "not-configured" adapter.
 *
 * Supabase requires SSL. The `postgres` driver accepts `ssl: "require"` which
 * works for both Supabase pooler and direct connections.
 */
function client(): Sql {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  sql = postgres(url, {
    ssl: "require",
    max: 4,
    idle_timeout: 20,
    prepare: false, // safer with pgbouncer / Supabase pooler
  });
  return sql;
}

// ---------- Row mappers ----------

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  skills: unknown;
  supported_networks: number[];
  status: string;
  wallet_address: string | null;
  owner_address: string | null;
  pricing: unknown;
  created_at: string;
  updated_at: string;
  total_tasks: number | null;
  completed_tasks: number | null;
  user_rating_avg: string | null;
  false_alert_reports: number | null;
  useful_alert_count: number | null;
  score: string | null;
  onchain_proof_hash: string | null;
  rep_updated_at: string | null;
  proposals_created: number | null;
  proposals_approved: number | null;
  proposals_rejected: number | null;
  executions_completed: number | null;
  executions_failed: number | null;
}

function parseJsonb<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function rowToAgent(r: AgentRow): Agent {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category as Agent["category"],
    description: r.description,
    skills: parseJsonb<Agent["skills"]>(r.skills, []),
    supportedNetworks: r.supported_networks ?? [],
    status: r.status as Agent["status"],
    walletAddress: (r.wallet_address as `0x${string}` | null) ?? null,
    ownerAddress: (r.owner_address as `0x${string}` | null) ?? null,
    pricing: parseJsonb<Agent["pricing"]>(r.pricing, { model: "free" }),
    reputation: {
      score: r.score !== null ? Number(r.score) : null,
      totalTasks: r.total_tasks ?? 0,
      completedTasks: r.completed_tasks ?? 0,
      userRatingAverage: r.user_rating_avg !== null ? Number(r.user_rating_avg) : null,
      falseAlertReports: r.false_alert_reports ?? 0,
      usefulAlertCount: r.useful_alert_count ?? 0,
      proposalsCreated: r.proposals_created ?? 0,
      proposalsApproved: r.proposals_approved ?? 0,
      proposalsRejected: r.proposals_rejected ?? 0,
      executionsCompleted: r.executions_completed ?? 0,
      executionsFailed: r.executions_failed ?? 0,
      onchainProofHash: r.onchain_proof_hash,
      updatedAt: r.rep_updated_at ?? r.updated_at,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface TaskRow {
  id: string;
  user_wallet: string;
  agent_id: string;
  task_type: string;
  target_type: string;
  target_address: string | null;
  target_symbol: string | null;
  network: number;
  status: string;
  alert_channels: string[];
  risk_threshold: string | null;
  frequency: string;
  instructions: string | null;
  onchain_task_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    userWallet: r.user_wallet as `0x${string}`,
    agentId: r.agent_id,
    taskType: r.task_type as Task["taskType"],
    targetType: r.target_type as Task["targetType"],
    targetAddress: r.target_address as `0x${string}` | null,
    targetSymbol: r.target_symbol,
    network: r.network,
    status: r.status as Task["status"],
    alertChannels: r.alert_channels as Task["alertChannels"],
    riskThreshold: r.risk_threshold,
    frequency: r.frequency as Task["frequency"],
    instructions: r.instructions,
    onchainTaskId: r.onchain_task_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface AlertRow {
  id: string;
  task_id: string | null;
  agent_id: string | null;
  user_wallet: string;
  type: string;
  severity: string;
  title: string;
  explanation: string;
  confidence: string | null;
  source_url: string | null;
  source_type: string;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

function rowToAlert(r: AlertRow): Alert {
  return {
    id: r.id,
    taskId: r.task_id,
    agentId: r.agent_id,
    userWallet: r.user_wallet as `0x${string}`,
    type: r.type as Alert["type"],
    severity: r.severity as Alert["severity"],
    title: r.title,
    explanation: r.explanation,
    confidence: r.confidence !== null ? Number(r.confidence) : null,
    sourceUrl: r.source_url,
    sourceType: r.source_type as Alert["sourceType"],
    metadata: parseJsonb<Record<string, unknown> | undefined>(r.metadata, undefined),
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

interface RwaRow {
  id: string;
  name: string;
  symbol: string;
  category: string;
  network: number;
  contract_address: string;
  issuer: string | null;
  data_source: string;
  current_apy: string | null;
  liquidity: string | null;
  risk_score: string | null;
  risk_breakdown: Record<string, number | null> | null;
  last_updated: string | null;
}

function rowToRwa(r: RwaRow, agentIds: string[]): RwaAsset {
  const empty = {
    liquidity: null,
    issuerTransparency: null,
    yieldVolatility: null,
    redemption: null,
    contract: null,
    oracle: null,
    marketDepth: null,
    abnormalMovement: null,
  };
  return {
    id: r.id,
    name: r.name,
    symbol: r.symbol,
    category: r.category as RwaAsset["category"],
    network: r.network,
    contractAddress: r.contract_address as `0x${string}`,
    issuer: r.issuer,
    dataSource: r.data_source,
    currentApy: r.current_apy !== null ? Number(r.current_apy) : null,
    liquidity: r.liquidity !== null ? Number(r.liquidity) : null,
    riskScore: r.risk_score !== null ? Number(r.risk_score) : null,
    riskBreakdown: {
      ...empty,
      ...parseJsonb<Record<string, number | null>>(r.risk_breakdown, {}),
    } as RwaAsset["riskBreakdown"],
    lastUpdated: r.last_updated,
    activeMonitoringAgentIds: agentIds,
  };
}

interface ExecutionProposalRow {
  id: string;
  user_wallet: string;
  agent_id: string;
  task_id: string | null;
  alert_id: string | null;
  provider: string;
  action_type: string;
  title: string;
  summary: string;
  rationale: string;
  risk_level: string;
  confidence: string | null;
  source_data: unknown;
  requested_params: unknown;
  status: string;
  user_approved_at: string | null;
  user_rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProposal(r: ExecutionProposalRow): ExecutionProposal {
  return {
    id: r.id,
    userWallet: r.user_wallet as `0x${string}`,
    agentId: r.agent_id,
    taskId: r.task_id,
    alertId: r.alert_id,
    provider: r.provider as ExecutionProviderName,
    actionType: r.action_type as ExecutionActionType,
    title: r.title,
    summary: r.summary,
    rationale: r.rationale,
    riskLevel: r.risk_level as ExecutionRiskLevel,
    confidence: r.confidence !== null ? Number(r.confidence) : null,
    sourceData: parseJsonb<Record<string, unknown>>(r.source_data, {}),
    requestedParams: parseJsonb<Record<string, unknown>>(r.requested_params, {}),
    status: r.status as ExecutionProposalStatus,
    userApprovedAt: r.user_approved_at,
    userRejectedAt: r.user_rejected_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface ExecutionLogRow {
  id: string;
  proposal_id: string;
  user_wallet: string;
  provider: string;
  status: string;
  transaction_hash: string | null;
  external_execution_id: string | null;
  request_payload: unknown;
  response_payload: unknown;
  error_message: string | null;
  created_at: string;
}

function rowToLog(r: ExecutionLogRow): ExecutionLogEntry {
  return {
    id: r.id,
    proposalId: r.proposal_id,
    userWallet: r.user_wallet as `0x${string}`,
    provider: r.provider as ExecutionProviderName,
    status: r.status as ExecutionLogEntry["status"],
    transactionHash: r.transaction_hash,
    externalExecutionId: r.external_execution_id,
    requestPayload: parseJsonb<Record<string, unknown>>(r.request_payload, {}),
    responsePayload: parseJsonb<Record<string, unknown> | null>(r.response_payload, null),
    errorMessage: r.error_message,
    createdAt: r.created_at,
  };
}

interface CapabilityRow {
  agent_id: string;
  provider: string;
  action_type: string;
  enabled: boolean;
  requires_approval: boolean;
}

function rowToCapability(r: CapabilityRow): AgentExecutionCapabilityRow {
  return {
    agentId: r.agent_id,
    provider: r.provider,
    actionType: r.action_type,
    enabled: r.enabled,
    requiresApproval: r.requires_approval,
  };
}

// ---------- Adapter ----------

export function createPostgresAdapter(): DatabaseAdapter {
  return {
    async listAgents({ category }: { category?: string } = {}): Promise<ServiceResult<Agent[]>> {
      try {
        const c = client();
        const rows = category
          ? await c<AgentRow[]>`
              select a.*, r.total_tasks, r.completed_tasks, r.user_rating_avg,
                     r.false_alert_reports, r.useful_alert_count, r.score,
                     r.onchain_proof_hash, r.updated_at as rep_updated_at,
                     r.proposals_created, r.proposals_approved, r.proposals_rejected,
                     r.executions_completed, r.executions_failed
              from agents a
              left join agent_reputation r on r.agent_id = a.id
              where a.category = ${category}
              order by coalesce(r.score, 0) desc, a.created_at desc
            `
          : await c<AgentRow[]>`
              select a.*, r.total_tasks, r.completed_tasks, r.user_rating_avg,
                     r.false_alert_reports, r.useful_alert_count, r.score,
                     r.onchain_proof_hash, r.updated_at as rep_updated_at,
                     r.proposals_created, r.proposals_approved, r.proposals_rejected,
                     r.executions_completed, r.executions_failed
              from agents a
              left join agent_reputation r on r.agent_id = a.id
              order by coalesce(r.score, 0) desc, a.created_at desc
            `;
        return ok(rows.map(rowToAgent));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async getAgentBySlug(slug: string): Promise<ServiceResult<Agent>> {
      try {
        const c = client();
        const rows = await c<AgentRow[]>`
          select a.*, r.total_tasks, r.completed_tasks, r.user_rating_avg,
                 r.false_alert_reports, r.useful_alert_count, r.score,
                 r.onchain_proof_hash, r.updated_at as rep_updated_at,
                 r.proposals_created, r.proposals_approved, r.proposals_rejected,
                 r.executions_completed, r.executions_failed
          from agents a
          left join agent_reputation r on r.agent_id = a.id
          where a.slug = ${slug}
          limit 1
        `;
        if (rows.length === 0) return err("not-found", "Agent not found.");
        return ok(rowToAgent(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async listUserTasks(userWallet: `0x${string}`): Promise<ServiceResult<Task[]>> {
      try {
        const rows = await client()<TaskRow[]>`
          select * from tasks where user_wallet = ${userWallet.toLowerCase()}
          order by created_at desc
        `;
        return ok(rows.map(rowToTask));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async insertTask(t): Promise<ServiceResult<Task>> {
      try {
        // Coerce every nullable column to a non-undefined value — postgres.js
        // typings reject `undefined` interpolations.
        const targetAddress: string | null = t.targetAddress
          ? t.targetAddress.toLowerCase()
          : null;
        const targetSymbol: string | null = t.targetSymbol ?? null;
        const riskThreshold: string | null = t.riskThreshold ?? null;
        const instructions: string | null = t.instructions ?? null;
        const onchainTaskId: string | null = t.onchainTaskId ?? null;
        const channels: string[] = [...t.alertChannels];

        const c = client();
        const query = c<TaskRow[]>`
          insert into tasks (
            user_wallet, agent_id, task_type, target_type, target_address,
            target_symbol, network, status, alert_channels, risk_threshold,
            frequency, instructions, onchain_task_id
          ) values (
            ${t.userWallet.toLowerCase()}, ${t.agentId}, ${t.taskType}, ${t.targetType},
            ${targetAddress}, ${targetSymbol},
            ${t.network}, ${t.status}, ${channels},
            ${riskThreshold}, ${t.frequency}, ${instructions}, ${onchainTaskId}
          )
          returning *
        `;
        const rows = (await query) as unknown as TaskRow[];
        return ok(rowToTask(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async listUserAlerts(userWallet: `0x${string}`): Promise<ServiceResult<Alert[]>> {
      try {
        const rows = await client()<AlertRow[]>`
          select * from alerts where user_wallet = ${userWallet.toLowerCase()}
          order by created_at desc
          limit 100
        `;
        return ok(rows.map(rowToAlert));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async insertAlert(a): Promise<ServiceResult<Alert>> {
      try {
        const metadata = a.metadata ? JSON.stringify(a.metadata) : null;
        const c = client();
        const query = c<AlertRow[]>`
          insert into alerts (
            task_id, agent_id, user_wallet, type, severity,
            title, explanation, confidence, source_url, source_type,
            metadata, read_at
          ) values (
            ${a.taskId ?? null}, ${a.agentId ?? null}, ${a.userWallet.toLowerCase()},
            ${a.type}, ${a.severity},
            ${a.title}, ${a.explanation},
            ${a.confidence ?? null}, ${a.sourceUrl ?? null}, ${a.sourceType},
            ${metadata}::jsonb, ${a.readAt ?? null}
          )
          returning *
        `;
        const rows = (await query) as unknown as AlertRow[];
        return ok(rowToAlert(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async markAlertRead(alertId: string, userWallet: `0x${string}`): Promise<ServiceResult<Alert>> {
      try {
        const rows = await client()<AlertRow[]>`
          update alerts set read_at = now()
          where id = ${alertId} and user_wallet = ${userWallet.toLowerCase()}
          returning *
        `;
        if (rows.length === 0) return err("not-found", "Alert not found.");
        return ok(rowToAlert(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async listRwaAssets(): Promise<ServiceResult<RwaAsset[]>> {
      try {
        const rows = await client()<RwaRow[]>`
          select * from rwa_assets order by name asc
        `;
        return ok(rows.map((r) => rowToRwa(r, [])));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async getRwaAssetByAddress(address: `0x${string}`): Promise<ServiceResult<RwaAsset>> {
      try {
        const rows = await client()<RwaRow[]>`
          select * from rwa_assets where contract_address = ${address.toLowerCase()}
          limit 1
        `;
        if (rows.length === 0) return err("not-found", "Asset not found.");
        return ok(rowToRwa(rows[0], []));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async upsertRwaAsset(a): Promise<ServiceResult<RwaAsset>> {
      try {
        const riskBreakdown = a.riskBreakdown ? JSON.stringify(a.riskBreakdown) : null;
        const c = client();
        const query = c<RwaRow[]>`
          insert into rwa_assets (
            name, symbol, category, network, contract_address, issuer,
            data_source, current_apy, liquidity, risk_score, risk_breakdown, last_updated
          ) values (
            ${a.name}, ${a.symbol}, ${a.category}, ${a.network},
            ${a.contractAddress.toLowerCase()}, ${a.issuer ?? null},
            ${a.dataSource}, ${a.currentApy ?? null}, ${a.liquidity ?? null},
            ${a.riskScore ?? null}, ${riskBreakdown}::jsonb,
            ${a.lastUpdated ?? new Date().toISOString()}
          )
          on conflict (network, contract_address) do update set
            name = excluded.name,
            symbol = excluded.symbol,
            category = excluded.category,
            issuer = excluded.issuer,
            data_source = excluded.data_source,
            current_apy = excluded.current_apy,
            liquidity = excluded.liquidity,
            risk_score = excluded.risk_score,
            risk_breakdown = excluded.risk_breakdown,
            last_updated = excluded.last_updated
          returning *
        `;
        const rows = (await query) as unknown as RwaRow[];
        return ok(rowToRwa(rows[0], []));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async getAlertById(alertId, userWallet): Promise<ServiceResult<Alert>> {
      try {
        const rows = await client()<AlertRow[]>`
          select * from alerts
          where id = ${alertId} and user_wallet = ${userWallet.toLowerCase()}
          limit 1
        `;
        if (rows.length === 0) return err("not-found", "Alert not found.");
        return ok(rowToAlert(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async insertExecutionProposal(p): Promise<ServiceResult<ExecutionProposal>> {
      try {
        const sourceData = JSON.stringify(p.sourceData ?? {});
        const requestedParams = JSON.stringify(p.requestedParams ?? {});
        const c = client();
        const query = c<ExecutionProposalRow[]>`
          insert into execution_proposals (
            user_wallet, agent_id, task_id, alert_id, provider,
            action_type, title, summary, rationale, risk_level,
            confidence, source_data, requested_params, status,
            user_approved_at, user_rejected_at
          ) values (
            ${p.userWallet.toLowerCase()}, ${p.agentId}, ${p.taskId ?? null}, ${p.alertId ?? null},
            ${p.provider}, ${p.actionType}, ${p.title}, ${p.summary}, ${p.rationale},
            ${p.riskLevel}, ${p.confidence ?? null},
            ${sourceData}::jsonb, ${requestedParams}::jsonb,
            ${p.status}, ${p.userApprovedAt ?? null}, ${p.userRejectedAt ?? null}
          )
          returning *
        `;
        const rows = (await query) as unknown as ExecutionProposalRow[];
        return ok(rowToProposal(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async listUserExecutionProposals(userWallet): Promise<ServiceResult<ExecutionProposal[]>> {
      try {
        const rows = await client()<ExecutionProposalRow[]>`
          select * from execution_proposals
          where user_wallet = ${userWallet.toLowerCase()}
          order by created_at desc
          limit 200
        `;
        return ok(rows.map(rowToProposal));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async getExecutionProposalById(id, userWallet): Promise<ServiceResult<ExecutionProposal>> {
      try {
        const rows = await client()<ExecutionProposalRow[]>`
          select * from execution_proposals
          where id = ${id} and user_wallet = ${userWallet.toLowerCase()}
          limit 1
        `;
        if (rows.length === 0) return err("not-found", "Proposal not found.");
        return ok(rowToProposal(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async updateExecutionProposalStatus(id, status): Promise<ServiceResult<ExecutionProposal>> {
      try {
        const rows = await client()<ExecutionProposalRow[]>`
          update execution_proposals
          set status = ${status}, updated_at = now()
          where id = ${id}
          returning *
        `;
        if (rows.length === 0) return err("not-found", "Proposal not found.");
        return ok(rowToProposal(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async approveExecutionProposal(id, userWallet): Promise<ServiceResult<ExecutionProposal>> {
      try {
        const rows = await client()<ExecutionProposalRow[]>`
          update execution_proposals
          set status = 'approved', user_approved_at = now(), updated_at = now()
          where id = ${id} and user_wallet = ${userWallet.toLowerCase()}
            and status in ('pending_approval', 'draft')
          returning *
        `;
        if (rows.length === 0) {
          return err("not-found", "Proposal not found or not in an approvable state.");
        }
        return ok(rowToProposal(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async rejectExecutionProposal(id, userWallet): Promise<ServiceResult<ExecutionProposal>> {
      try {
        const rows = await client()<ExecutionProposalRow[]>`
          update execution_proposals
          set status = 'rejected', user_rejected_at = now(), updated_at = now()
          where id = ${id} and user_wallet = ${userWallet.toLowerCase()}
          returning *
        `;
        if (rows.length === 0) return err("not-found", "Proposal not found.");
        return ok(rowToProposal(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async insertExecutionLog(entry): Promise<ServiceResult<ExecutionLogEntry>> {
      try {
        const req = JSON.stringify(entry.requestPayload ?? {});
        const resp = entry.responsePayload ? JSON.stringify(entry.responsePayload) : null;
        const c = client();
        const query = c<ExecutionLogRow[]>`
          insert into execution_logs (
            proposal_id, user_wallet, provider, status,
            transaction_hash, external_execution_id,
            request_payload, response_payload, error_message
          ) values (
            ${entry.proposalId}, ${entry.userWallet.toLowerCase()}, ${entry.provider}, ${entry.status},
            ${entry.transactionHash ?? null}, ${entry.externalExecutionId ?? null},
            ${req}::jsonb, ${resp}::jsonb, ${entry.errorMessage ?? null}
          )
          returning *
        `;
        const rows = (await query) as unknown as ExecutionLogRow[];
        return ok(rowToLog(rows[0]));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async listExecutionLogsForProposal(proposalId): Promise<ServiceResult<ExecutionLogEntry[]>> {
      try {
        const rows = await client()<ExecutionLogRow[]>`
          select * from execution_logs
          where proposal_id = ${proposalId}
          order by created_at desc
        `;
        return ok(rows.map(rowToLog));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async bumpAgentReputation(agentId, deltas): Promise<ServiceResult<true>> {
      try {
        const d = {
          proposalsCreated: deltas.proposalsCreated ?? 0,
          proposalsApproved: deltas.proposalsApproved ?? 0,
          proposalsRejected: deltas.proposalsRejected ?? 0,
          executionsCompleted: deltas.executionsCompleted ?? 0,
          executionsFailed: deltas.executionsFailed ?? 0,
          usefulAlertCount: deltas.usefulAlertCount ?? 0,
          falseAlertReports: deltas.falseAlertReports ?? 0,
        };
        const c = client();
        // Upsert so an agent that somehow doesn't have a reputation row yet still gets one.
        await c`
          insert into agent_reputation (
            agent_id, proposals_created, proposals_approved, proposals_rejected,
            executions_completed, executions_failed,
            useful_alert_count, false_alert_reports
          ) values (
            ${agentId}, ${d.proposalsCreated}, ${d.proposalsApproved}, ${d.proposalsRejected},
            ${d.executionsCompleted}, ${d.executionsFailed},
            ${d.usefulAlertCount}, ${d.falseAlertReports}
          )
          on conflict (agent_id) do update set
            proposals_created = agent_reputation.proposals_created + ${d.proposalsCreated},
            proposals_approved = agent_reputation.proposals_approved + ${d.proposalsApproved},
            proposals_rejected = agent_reputation.proposals_rejected + ${d.proposalsRejected},
            executions_completed = agent_reputation.executions_completed + ${d.executionsCompleted},
            executions_failed = agent_reputation.executions_failed + ${d.executionsFailed},
            useful_alert_count = agent_reputation.useful_alert_count + ${d.usefulAlertCount},
            false_alert_reports = agent_reputation.false_alert_reports + ${d.falseAlertReports},
            updated_at = now()
        `;
        return ok(true as const);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async getAgentReputationSnapshot(agentId) {
      try {
        const rows = await client()<
          {
            slug: string;
            score: string | null;
            useful_alert_count: number | null;
            false_alert_reports: number | null;
            proposals_approved: number | null;
            proposals_rejected: number | null;
            proposals_created: number | null;
            executions_completed: number | null;
            executions_failed: number | null;
          }[]
        >`
          select a.slug, r.score,
                 r.useful_alert_count, r.false_alert_reports,
                 r.proposals_approved, r.proposals_rejected, r.proposals_created,
                 r.executions_completed, r.executions_failed
          from agents a
          left join agent_reputation r on r.agent_id = a.id
          where a.id = ${agentId}
          limit 1
        `;
        if (rows.length === 0) return err("not-found", "Agent not found.");
        const r = rows[0];
        const alertCount = (r.useful_alert_count ?? 0) - (r.false_alert_reports ?? 0);
        const proposalCount = r.proposals_approved ?? 0;
        const executionCount = r.executions_completed ?? 0;
        return ok({
          slug: r.slug,
          score: r.score !== null ? Number(r.score) : 50,
          alertCount: Math.max(0, alertCount),
          proposalCount,
          executionCount,
          breakdown: {
            usefulAlertCount: r.useful_alert_count ?? 0,
            falseAlertReports: r.false_alert_reports ?? 0,
            proposalsCreated: r.proposals_created ?? 0,
            proposalsApproved: r.proposals_approved ?? 0,
            proposalsRejected: r.proposals_rejected ?? 0,
            executionsCompleted: r.executions_completed ?? 0,
            executionsFailed: r.executions_failed ?? 0,
          },
        });
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async setAgentReputationAnchor(agentId, txHash) {
      try {
        await client()`
          update agent_reputation
          set onchain_proof_hash = ${txHash}, updated_at = now()
          where agent_id = ${agentId}
        `;
        return ok(true as const);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async recomputeAgentReputationScore(agentId): Promise<ServiceResult<true>> {
      try {
        const c = client();
        // Composite score (0–100). Documented in the reputation service so the
        // formula stays close to where it's reasoned about.
        await c`
          update agent_reputation set
            score = greatest(0, least(100,
              50
              + (useful_alert_count - false_alert_reports) * 3
              + executions_completed * 2
              - executions_failed * 4
              + least(proposals_approved, 10) * 1
              - least(proposals_rejected, 10) * 0.5
            ))::numeric,
            updated_at = now()
          where agent_id = ${agentId}
        `;
        return ok(true as const);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async listAgentExecutionCapabilities(
      agentId,
    ): Promise<ServiceResult<AgentExecutionCapabilityRow[]>> {
      try {
        const rows = await client()<CapabilityRow[]>`
          select agent_id, provider, action_type, enabled, requires_approval
          from agent_execution_capabilities
          where agent_id = ${agentId}
          order by provider asc, action_type asc
        `;
        return ok(rows.map(rowToCapability));
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async createTelegramBindingCode(wallet, code, ttlMs) {
      try {
        const expires = new Date(Date.now() + ttlMs);
        await client()`
          insert into telegram_pending_codes (code, wallet, expires_at)
          values (${code}, ${wallet.toLowerCase()}, ${expires})
        `;
        return ok(true as const);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async consumeTelegramBindingCode(code) {
      try {
        const c = client();
        const rows = await c<{ wallet: string; expires_at: string }[]>`
          delete from telegram_pending_codes
          where code = ${code}
          returning wallet, expires_at
        `;
        if (rows.length === 0) return ok(null);
        const row = rows[0];
        if (new Date(row.expires_at).getTime() < Date.now()) return ok(null);
        return ok(row.wallet as `0x${string}`);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async saveTelegramBinding(b) {
      try {
        await client()`
          insert into telegram_bindings (wallet, chat_id, username, first_name)
          values (${b.wallet.toLowerCase()}, ${b.chatId}, ${b.username ?? null}, ${b.firstName ?? null})
          on conflict (wallet) do update set
            chat_id = excluded.chat_id,
            username = excluded.username,
            first_name = excluded.first_name
        `;
        return ok(true as const);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async getTelegramBindingByWallet(wallet) {
      try {
        const rows = await client()<
          { wallet: string; chat_id: string; username: string | null; first_name: string | null; created_at: string }[]
        >`
          select wallet, chat_id, username, first_name, created_at
          from telegram_bindings
          where wallet = ${wallet.toLowerCase()}
          limit 1
        `;
        if (rows.length === 0) return ok(null);
        const r = rows[0];
        return ok({
          wallet: r.wallet as `0x${string}`,
          chatId: Number(r.chat_id),
          username: r.username ?? undefined,
          firstName: r.first_name ?? undefined,
          createdAt: new Date(r.created_at).getTime(),
        });
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },

    async removeTelegramBinding(wallet) {
      try {
        const rows = await client()`
          delete from telegram_bindings where wallet = ${wallet.toLowerCase()} returning wallet
        `;
        return ok(rows.length > 0);
      } catch (e) {
        return err("upstream", `DB error: ${(e as Error).message}`);
      }
    },
  };
}

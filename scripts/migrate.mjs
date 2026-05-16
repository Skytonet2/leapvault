/**
 * Apply the LeapVault Agent schema + seed agents.
 *
 * Usage:
 *   node --env-file=.env.local scripts/migrate.mjs
 *
 * Idempotent: safe to run multiple times. CREATE TABLE IF NOT EXISTS + ON CONFLICT.
 */

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Aborting.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", prepare: false });

const SCHEMA = /* sql */ `
create extension if not exists pgcrypto;

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  description text not null,
  skills jsonb not null default '[]'::jsonb,
  supported_networks integer[] not null default '{}',
  status text not null default 'available',
  wallet_address text,
  owner_address text,
  pricing jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_reputation (
  agent_id uuid primary key references agents(id) on delete cascade,
  total_tasks integer not null default 0,
  completed_tasks integer not null default 0,
  user_rating_avg numeric,
  false_alert_reports integer not null default 0,
  useful_alert_count integer not null default 0,
  score numeric,
  onchain_proof_hash text,
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_wallet text not null,
  agent_id uuid not null references agents(id),
  task_type text not null,
  target_type text not null,
  target_address text,
  target_symbol text,
  network integer not null,
  status text not null default 'pending',
  alert_channels text[] not null default '{}',
  risk_threshold numeric,
  frequency text not null default 'daily',
  instructions text,
  onchain_task_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_user_wallet_idx on tasks(user_wallet);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  user_wallet text not null,
  type text not null,
  severity text not null,
  title text not null,
  explanation text not null,
  confidence numeric,
  source_url text,
  source_type text not null,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists alerts_user_wallet_idx on alerts(user_wallet, created_at desc);

create table if not exists rwa_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  symbol text not null,
  category text not null,
  network integer not null,
  contract_address text not null,
  issuer text,
  data_source text not null,
  current_apy numeric,
  liquidity numeric,
  risk_score numeric,
  risk_breakdown jsonb,
  last_updated timestamptz,
  unique (network, contract_address)
);

create table if not exists wallet_watches (
  id uuid primary key default gen_random_uuid(),
  user_wallet text not null,
  target_wallet text not null,
  label text,
  network integer not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_wallet text,
  provider text not null,
  model text not null,
  feature text not null,
  input_hash text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_day_idx on ai_usage_log(user_wallet, created_at);

create table if not exists ai_cache (
  id uuid primary key default gen_random_uuid(),
  input_hash text not null,
  provider text not null,
  model text not null,
  feature text not null,
  response jsonb not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (input_hash, provider, model, feature)
);

create table if not exists telegram_bindings (
  wallet text primary key,
  chat_id bigint not null,
  username text,
  first_name text,
  created_at timestamptz not null default now()
);
create unique index if not exists telegram_bindings_chat_idx on telegram_bindings(chat_id);

create table if not exists telegram_pending_codes (
  code text primary key,
  wallet text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists telegram_pending_codes_expires_idx on telegram_pending_codes(expires_at);

create table if not exists execution_provider_config (
  id uuid primary key default gen_random_uuid(),
  user_wallet text not null,
  provider text not null,
  enabled boolean not null default false,
  dry_run boolean not null default true,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_wallet, provider)
);

create table if not exists execution_proposals (
  id uuid primary key default gen_random_uuid(),
  user_wallet text not null,
  agent_id uuid references agents(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  alert_id uuid references alerts(id) on delete set null,
  provider text not null,
  action_type text not null,
  title text not null,
  summary text not null,
  rationale text not null,
  risk_level text not null,
  confidence numeric,
  source_data jsonb,
  requested_params jsonb,
  status text not null default 'pending_approval',
  user_approved_at timestamptz,
  user_rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists execution_proposals_user_idx
  on execution_proposals(user_wallet, created_at desc);

create table if not exists execution_logs (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references execution_proposals(id) on delete cascade,
  user_wallet text not null,
  provider text not null,
  status text not null,
  transaction_hash text,
  external_execution_id text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists execution_logs_proposal_idx
  on execution_logs(proposal_id, created_at desc);

create table if not exists provider_health_checks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null,
  latency_ms integer,
  error_message text,
  checked_at timestamptz not null default now()
);

create table if not exists agent_execution_capabilities (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  provider text not null,
  action_type text not null,
  enabled boolean not null default true,
  requires_approval boolean not null default true,
  created_at timestamptz not null default now(),
  unique (agent_id, provider, action_type)
);

create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists auth_codes (
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (email, code_hash)
);
create index if not exists auth_codes_email_idx on auth_codes(email);

create table if not exists auth_sessions (
  token text primary key,
  user_id uuid not null references auth_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip_hash text
);
create index if not exists auth_sessions_user_idx on auth_sessions(user_id);

create table if not exists auth_user_wallets (
  user_id uuid not null references auth_users(id) on delete cascade,
  wallet_address text not null,
  linked_at timestamptz not null default now(),
  primary key (user_id, wallet_address)
);
create index if not exists auth_user_wallets_wallet_idx on auth_user_wallets(wallet_address);

alter table agent_reputation
  add column if not exists proposals_created integer not null default 0,
  add column if not exists proposals_approved integer not null default 0,
  add column if not exists proposals_rejected integer not null default 0,
  add column if not exists executions_completed integer not null default 0,
  add column if not exists executions_failed integer not null default 0,
  add column if not exists user_feedback_score numeric;
`;

const SEED_AGENTS = [
  {
    slug: "smart-wallet-tracker",
    name: "Smart Wallet Tracker",
    category: "smart-wallet",
    description:
      "Tracks selected wallets, detects unusual movement, and sends explainable alerts with source links and confidence scores.",
    skills: [
      { id: "watch", label: "Watch list" },
      { id: "anomaly", label: "Anomaly detection" },
      { id: "explain", label: "Explainable alerts" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "free" },
  },
  {
    slug: "whale-alert",
    name: "Whale Alert Agent",
    category: "whale",
    description:
      "Surfaces large on-chain transfers and unusual flows from high-balance wallets, with context-aware filtering.",
    skills: [
      { id: "size-filter", label: "Size thresholds" },
      { id: "flow", label: "Flow analysis" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "subscription", currency: "MNT", amount: "5", unit: "month" },
  },
  {
    slug: "rwa-yield-risk",
    name: "RWA Yield Risk Agent",
    category: "rwa-yield",
    description:
      "Monitors yield-bearing real-world assets — APY swings, liquidity contractions, redemption stress.",
    skills: [
      { id: "apy", label: "APY tracking" },
      { id: "liquidity", label: "Liquidity stress" },
      { id: "redemption", label: "Redemption health" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "subscription", currency: "MNT", amount: "8", unit: "month" },
  },
  {
    slug: "token-risk",
    name: "Token Risk Agent",
    category: "token-risk",
    description:
      "Watches tokens for ownership concentration, contract anomalies, and abnormal price/volume behavior.",
    skills: [
      { id: "concentration", label: "Ownership concentration" },
      { id: "contract", label: "Contract anomalies" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "per-task", currency: "MNT", amount: "0.25", unit: "task" },
  },
  {
    slug: "liquidity-flow",
    name: "Liquidity Flow Agent",
    category: "liquidity",
    description:
      "Tracks AMM pool depth, slippage, and net flow on monitored pairs across Mantle DEXes.",
    skills: [
      { id: "depth", label: "Pool depth" },
      { id: "slippage", label: "Slippage" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "free" },
  },
  {
    slug: "portfolio-risk",
    name: "Portfolio Risk Agent",
    category: "portfolio-risk",
    description:
      "Composite risk scoring across a wallet's holdings — correlation, concentration, and counterparty exposure.",
    skills: [
      { id: "diversification", label: "Diversification" },
      { id: "counterparty", label: "Counterparty exposure" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "subscription", currency: "MNT", amount: "12", unit: "month" },
  },
  {
    slug: "reputation",
    name: "Reputation Agent",
    category: "reputation",
    description:
      "Maintains the on-chain reputation of agents based on completed-task outcomes and user feedback.",
    skills: [
      { id: "score", label: "Score updates" },
      { id: "proof", label: "On-chain proofs" },
    ],
    supported_networks: [5000, 5003],
    pricing: { model: "free" },
  },
];

const AGENT_EXECUTION_CAPABILITIES = {
  "smart-wallet-tracker": [
    { provider: "manual", actionType: "monitor_only" },
    { provider: "realclaw", actionType: "swap" },
  ],
  "whale-alert": [
    { provider: "manual", actionType: "monitor_only" },
    { provider: "manual", actionType: "risk_report" },
  ],
  "rwa-yield-risk": [
    { provider: "manual", actionType: "risk_report" },
    { provider: "realclaw", actionType: "rebalance" },
    { provider: "byreal", actionType: "close_lp_position" },
  ],
  "token-risk": [
    { provider: "manual", actionType: "risk_report" },
    { provider: "manual", actionType: "monitor_only" },
  ],
  "liquidity-flow": [
    { provider: "manual", actionType: "risk_report" },
    { provider: "byreal", actionType: "open_lp_position" },
    { provider: "byreal", actionType: "close_lp_position" },
  ],
  "portfolio-risk": [
    { provider: "manual", actionType: "risk_report" },
    { provider: "realclaw", actionType: "rebalance" },
  ],
  reputation: [{ provider: "manual", actionType: "risk_report" }],
};

async function run() {
  console.log("Applying schema…");
  await sql.unsafe(SCHEMA);
  console.log("Schema applied.");

  console.log("Seeding agents (idempotent upsert)…");
  for (const a of SEED_AGENTS) {
    const inserted = await sql`
      insert into agents (slug, name, category, description, skills, supported_networks, pricing, status)
      values (${a.slug}, ${a.name}, ${a.category}, ${a.description},
              ${JSON.stringify(a.skills)}::jsonb,
              ${a.supported_networks}::integer[],
              ${JSON.stringify(a.pricing)}::jsonb,
              'available')
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        skills = excluded.skills,
        supported_networks = excluded.supported_networks,
        pricing = excluded.pricing,
        updated_at = now()
      returning id
    `;
    const agentId = inserted[0].id;
    await sql`
      insert into agent_reputation (agent_id, total_tasks, completed_tasks, useful_alert_count, false_alert_reports)
      values (${agentId}, 0, 0, 0, 0)
      on conflict (agent_id) do nothing
    `;

    const caps = AGENT_EXECUTION_CAPABILITIES[a.slug] ?? [];
    for (const cap of caps) {
      await sql`
        insert into agent_execution_capabilities (agent_id, provider, action_type, enabled, requires_approval)
        values (${agentId}, ${cap.provider}, ${cap.actionType}, true, true)
        on conflict (agent_id, provider, action_type) do nothing
      `;
    }

    console.log("  ✓ " + a.slug + " (" + caps.length + " execution capabilities)");
  }

  console.log("Done.");
  await sql.end();
}

run().catch(async (e) => {
  console.error("Migration failed:");
  console.error(e);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
});

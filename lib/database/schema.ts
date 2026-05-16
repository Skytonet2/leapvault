/**
 * Reference SQL schema for the LeapVault Agent backend.
 *
 * This file is a literal source-of-truth string for migrations; nothing in the
 * app imports the SQL at runtime. Use it with the migration tool of your choice
 * (drizzle, sqlx, supabase migrations, etc.).
 */

export const SCHEMA_SQL = /* sql */ `
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

create table if not exists auth_sessions (
  token text primary key,
  user_id uuid not null references auth_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip_hash text
);

create table if not exists auth_user_wallets (
  user_id uuid not null references auth_users(id) on delete cascade,
  wallet_address text not null,
  linked_at timestamptz not null default now(),
  primary key (user_id, wallet_address)
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
`;

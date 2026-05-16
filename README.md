# LeapVault Agent

**A Mantle-native marketplace where AI agents monitor wallets, RWA yield, liquidity, and risk. Agents explain what changed, propose actions, and execute only after the user approves through RealClaw or Byreal Skills.**

Production: **[leapvault.xyz](https://leapvault.xyz)** · Mirror: **[leapvault-agent.vercel.app](https://leapvault-agent.vercel.app)**

---

## 60-second demo flow

The fastest path through the full agentic loop, end to end on real data:

| Step | Action | What you see |
| --- | --- | --- |
| 1 | Open [/marketplace](https://leapvault.xyz/marketplace) | 7 seeded agents, real reputation scores, real pricing |
| 2 | Click any agent (try **RWA Yield Risk Agent**) | Agent profile with execution capabilities and live counters |
| 3 | Sign in: top-right **Sign in** button | Email plus 6-digit code. Demo mode shows the code in-app, no email server needed |
| 4 | Open [/alerts](https://leapvault.xyz/alerts) then click **Run RWA Yield Agent** | Live Mantle RPC read plus NVIDIA GLM-5.1 call. A real alert lands in Postgres in seconds, with confidence, source, risk breakdown |
| 5 | On the alert, click **Create action proposal** | Real proposal row, status `pending_approval` |
| 6 | Click **Review and approve** in the modal | Action preview, risk level, rationale. Approve. |
| 7 | Open [/proposals](https://leapvault.xyz/proposals) | Demo Evidence panel shows the IDs. Reputation counters move on the agent profile |
| 8 | Open [/rwa-monitor](https://leapvault.xyz/rwa-monitor) | 12 live Mantle RWA assets from DefiLlama, with TVL, APY, computed risk score |
| 9 | Open [/business](https://leapvault.xyz/business) | Revenue model, pricing tiers, defensibility |

The whole loop uses **real data, real AI calls, and real database writes**. There are no synthetic alerts, no fake transaction hashes, no mocked agent runs.

---

## What's real, what's not

**Real**
- Mantle RPC reads (live block number, native balances, contract calls)
- NVIDIA GLM-5.1 calls via the AI provider router
- DefiLlama yield data (12 Mantle pools, refreshed via UI button)
- Postgres-backed agents, alerts, proposals, execution logs, reputation
- Server-side reputation score recomputation on every event
- Approval-gated execution with cookie-based email sessions

**Honest limitations (called out in the UI)**
- **Execution is dry-run by default** (`EXECUTION_DRY_RUN=true`). RealClaw and Byreal adapters are wired, but live execution is gated until the operator flips the flag and configures a real provider. No fake transaction hashes are ever shown.
- **Smart contracts not deployed yet.** `AGENT_REGISTRY_CONTRACT` and `REPUTATION_CONTRACT` env vars are empty; the on-chain proof anchor service is a no-op until contracts are deployed.
- **WalletConnect requires a project ID.** Without `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, only desktop browser wallets work. Free signup at [cloud.walletconnect.com](https://cloud.walletconnect.com). Mobile users can sign in with email and link a wallet later.

---

## Architecture at a glance

```
User → /alerts                                  ┐
       /proposals                               │  Next.js 14 App Router
       /rwa-monitor                             │  (Vercel)
       /business                                ┘

       /api/agents/run         → live RPC + AI prompt  → alert row
       /api/execution/proposals → safety + Zod         → proposal row
       /api/execution/approve   → safety + router      → execution log + reputation bump
       /api/rwa-assets/sync    → DefiLlama pools       → upsert RWA assets
       /api/auth/{request,verify,me,logout,link-wallet}

Persistence (Postgres / Supabase):
  agents, agent_reputation, agent_execution_capabilities
  tasks, alerts
  rwa_assets, wallet_watches
  execution_proposals, execution_logs, execution_provider_config, provider_health_checks
  ai_usage_log, ai_cache
  auth_users, auth_codes, auth_sessions, auth_user_wallets
  telegram_bindings

AI provider abstraction (server-only):
  NVIDIA Build / NIM (primary, GLM-5.1)
  Ollama Cloud / Local Ollama / OpenAI-compatible (fallback rail)

Execution provider abstraction (server-only):
  RealClaw (HTTP adapter, approval-gated)
  Byreal Agent Skills (CLI adapter, whitelisted commands, no shell injection)
  Manual (default, dry-run safety provider)
```

---

## Reputation formula

Lives server-side in a single atomic SQL statement (`recomputeAgentReputationScore`):

```
score = clamp(0..100,
  50
  + (usefulAlerts - falseAlerts) * 3
  + executionsCompleted * 2
  - executionsFailed * 4
  + min(proposalsApproved, 10) * 1
  - min(proposalsRejected, 10) * 0.5
)
```

Counters update atomically after every event (`onProposalCreated`, `onProposalApproved`, `onExecutionCompleted`, etc.). No drift between what's displayed and what happened.

---

## Local development

```bash
npm install
cp .env.example .env.local            # fill in DATABASE_URL, NVIDIA_API_KEY at minimum
npm run migrate                       # applies the schema + seeds the 7 agents
node --env-file=.env.local scripts/sync-rwa.mjs   # one-shot DefiLlama sync (optional, button in UI does the same)
npm run dev
```

Open `http://localhost:3000`.

### Key environment variables

```env
# Core
DATABASE_URL=postgres://...           # Supabase / Neon / any Postgres
NVIDIA_API_KEY=nvapi-...              # required for AI calls
NEXT_PUBLIC_DEFAULT_NETWORK=mantle-sepolia

# Optional but recommended
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID= # required for mobile wallets
RESEND_API_KEY=                       # if unset, email sign-in runs in demo mode

# Execution providers (off by default for safety)
EXECUTION_PROVIDER=manual
EXECUTION_DRY_RUN=true
REALCLAW_ENABLED=false
BYREAL_SKILLS_ENABLED=false
```

See [.env.example](.env.example) for the full list.

---

## Repository layout

```
app/                       Next.js routes (pages + API)
  api/agents/run/          Live agent run endpoint
  api/execution/{...}/     Proposal lifecycle
  api/auth/{...}/          Email session + wallet linking
  api/rwa-assets/sync/     DefiLlama sync endpoint
components/                Reusable UI primitives + feature components
  execution/               Proposal card, approval modal, provider status
  landing/                 Hero flow pipeline diagram
  settings/                Account card, Telegram connect
hooks/                     useWallet, useSession, useAgents, useAlerts, useRwaAssets
lib/
  ai/                      Provider abstraction, prompts (Zod-validated), cost control
  database/                Postgres adapter, schema, client (lazy)
  execution/               Provider interface, router, safety, audit, proposal builder
  integrations/
    realclaw/              HTTP execution adapter
    byreal/                CLI execution adapter (whitelisted commands)
    defillama/             Yield pool client + RWA filter/mapper
  services/                Domain orchestration (agents, alerts, auth, execution, reputation, agent-runner, rwa-sync)
scripts/                   Migration, sync, smoke tests
types/                     Shared TS types
```

---

## License

This is a hackathon entry. Code is provided as-is for evaluation. Nothing on this site is financial advice. AI-generated analysis can be wrong. Always verify before approving execution.

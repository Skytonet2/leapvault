import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  ClipboardList,
  Compass,
  Eye,
  FileCode,
  PlusSquare,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackgroundAgentNetwork } from "@/components/background/BackgroundAgentNetwork";
import { FlowPipeline } from "@/components/landing/FlowPipeline";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-page">
      <MarketingNav />
      <Hero />
      <DemoFlow />
      <ExecutionLayerSection />
      <MarketplacePreview />
      <RwaPreview />
      <ReputationSection />
      <OnChainSection />
      <WhyMantle />
      <CtaSection />
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg-page/80 backdrop-blur-md">
      <div className="container flex items-center h-16 gap-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-bg-elevated border border-accent-sand/30 grid place-items-center">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-sand" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 12 L12 4 L20 12" />
              <path d="M4 12 L12 20 L20 12" opacity="0.6" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text-primary">LeapVault</div>
            <div className="text-[10px] tracking-[0.18em] text-text-muted uppercase">Agent</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-text-muted">
          <Link href="/marketplace" className="hover:text-text-primary">Marketplace</Link>
          <Link href="/rwa-monitor" className="hover:text-text-primary">RWA Monitor</Link>
          <Link href="/proposals" className="hover:text-text-primary">Proposals</Link>
          <Link href="/business" className="hover:text-text-primary">Business</Link>
          <Link href="#how" className="hover:text-text-primary">How it works</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/marketplace">Explore agents</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard">Launch app <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <BackgroundAgentNetwork />
      <div className="container relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-24 lg:py-32">
        <div className="space-y-7 animate-fade-up">
          <Badge variant="sand">
            <Sparkles className="h-3 w-3" /> Agent marketplace · Mantle · RealClaw-ready
          </Badge>
          <h1 className="text-display-1 font-semibold tracking-tight text-balance">
            Hire AI agents that{" "}
            <span className="text-accent-sand">monitor</span>,{" "}
            <span className="text-accent-sage">explain</span>, and{" "}
            <span className="text-accent-sand">propose</span>. You approve execution.
          </h1>
          <p className="text-lg text-text-muted max-w-xl leading-relaxed">
            LeapVault is a Mantle-native marketplace for monitoring wallets, RWA yield, liquidity,
            and risk. Agents create action proposals from real signals; RealClaw and Byreal Skills
            execute only after your approval.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/dashboard">Launch app <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/marketplace">Explore agents</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/business">
                <Briefcase className="h-4 w-4" /> Business model
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-2 pt-2">
            <TrustBadge label="7 seeded agents" />
            <TrustBadge label="12 live Mantle RWA assets" />
            <TrustBadge label="NVIDIA GLM-5.1 routing" />
            <TrustBadge label="Approval-gated execution" />
          </ul>
        </div>

        <div className="relative animate-fade-up">
          <FlowPipeline variant="art" />
        </div>
      </div>
    </section>
  );
}

function TrustBadge({ label }: { label: string }) {
  return (
    <li>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-bg-elevated/60 text-xs text-text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-sage" />
        {label}
      </span>
    </li>
  );
}

function DemoFlow() {
  return (
    <section id="how" className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="The flow"
          title="Monitor → Explain → Propose → Approve → Execute → Reputation"
          description="The same loop powers every agent. Autonomy is in the monitoring and reasoning, never in moving your funds."
          action={
            <Button variant="outline" asChild>
              <Link href="/proposals">
                See it live <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <FlowPipeline variant="detail" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <FlowCallout
            icon={Bell}
            title="Every alert is sourced"
            body="Confidence, data source, source URL, and explicit data limitations. No black-box predictions."
          />
          <FlowCallout
            icon={CheckSquare}
            title="Approval is the safety rail"
            body="A user-approved proposal is the only way an action can ever reach RealClaw or Byreal Skills."
          />
          <FlowCallout
            icon={ShieldCheck}
            title="Reputation reflects reality"
            body="Counters move atomically on every event. Agents earn trust from proven outcomes, not promotion."
          />
        </div>
      </div>
    </section>
  );
}

function FlowCallout({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="surface-card p-5">
      <Icon className="h-5 w-5 text-accent-sand mb-3" />
      <div className="text-sm font-medium text-text-primary">{title}</div>
      <div className="text-xs text-text-muted mt-1.5 leading-relaxed">{body}</div>
    </div>
  );
}

function ExecutionLayerSection() {
  return (
    <section className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="Execution layer"
          title="Connect execution after intelligence"
          description="LeapVault stays out of custody. Approved proposals route to RealClaw (HTTP adapter) or Byreal Agent Skills (CLI adapter). Both optional, both gated by your approval."
          action={
            <Button variant="outline" asChild>
              <Link href="/settings">
                Provider status <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-accent-sand/15 text-accent-sand grid place-items-center">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-text-primary">RealClaw</div>
                  <div className="text-xs text-text-muted">HTTP execution provider</div>
                </div>
              </div>
              <Badge variant="muted">Approval-gated</Badge>
            </div>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              Routes approved swap, rebalance, claim, and LP actions through a configured RealClaw
              endpoint. Capability discovery, health checks, and structured error reporting.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["Swap", "Rebalance", "Claim rewards", "LP positions"].map((c) => (
                <div
                  key={c}
                  className="rounded-md bg-bg-elevated/60 border border-border px-2.5 py-1.5 text-[11px] text-text-muted"
                >
                  {c}
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-accent-sage/15 text-accent-sage grid place-items-center">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-semibold text-text-primary">Byreal Agent Skills</div>
                  <div className="text-xs text-text-muted">CLI execution provider</div>
                </div>
              </div>
              <Badge variant="muted">Whitelisted commands</Badge>
            </div>
            <p className="text-sm text-text-muted leading-relaxed mb-3">
              Wraps the Byreal CLI with an allowlist of structured commands. No shell injection,
              no arbitrary args, no fund movement without approval. JSON output parsed and verified.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {["executeSwap", "openLpPosition", "closeLpPosition", "analyzePoolRisk"].map((c) => (
                <div
                  key={c}
                  className="rounded-md bg-bg-elevated/60 border border-border px-2.5 py-1.5 text-[11px] text-text-muted font-mono"
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-6 text-xs text-text-muted leading-relaxed">
          Dry-run mode is on by default. No transaction is sent until an admin flips
          <span className="text-accent-sand"> EXECUTION_DRY_RUN=false</span> and configures a real
          provider. Until then, every approval produces a clean dry-run log, never a fake hash.
        </p>
      </div>
    </section>
  );
}

function MarketplacePreview() {
  const cards = [
    {
      icon: Eye,
      title: "Smart Wallet Tracker",
      desc: "Tracks selected wallets, detects unusual movement, sends explainable alerts with confidence scores.",
      pricing: "Free",
    },
    {
      icon: Building2,
      title: "RWA Yield Risk Agent",
      desc: "Monitors yield-bearing real-world assets. APY swings, liquidity contractions, redemption stress.",
      pricing: "8 MNT / month",
    },
    {
      icon: Workflow,
      title: "Liquidity Flow Agent",
      desc: "Watches AMM pool depth, slippage, and net flow on monitored pairs across Mantle DEXes.",
      pricing: "Free",
    },
  ];
  return (
    <section className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="Marketplace"
          title="7 agents you can hire today"
          description="Each agent has a specialty, a pricing model, and a reputation score computed from real proposal and execution outcomes."
          action={
            <Button variant="outline" asChild>
              <Link href="/marketplace">
                Browse marketplace <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="surface-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-bg-elevated border border-border grid place-items-center text-accent-sand">
                  <c.icon className="h-5 w-5" />
                </div>
                <Badge variant="muted">{c.pricing}</Badge>
              </div>
              <div className="text-base font-semibold text-text-primary">{c.title}</div>
              <div className="text-sm text-text-muted leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RwaPreview() {
  const categories = [
    "Tokenized treasuries",
    "Yield-bearing stables",
    "Real estate",
    "Credit / invoices",
    "Commodities",
    "Liquid staking",
  ];
  return (
    <section className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="RWA Monitor"
          title="Real Mantle RWA data, refreshed on demand"
          description="The monitor pulls live yield-pool data from DefiLlama, filtered to high-TVL Mantle pools. Real APYs, real TVLs, computed risk scores. No synthetic entries."
          action={
            <Button variant="outline" asChild>
              <Link href="/rwa-monitor">
                Open RWA Monitor <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <RwaStat label="Mantle RWA assets" value="12" hint="live, DefiLlama-sourced" />
          <RwaStat label="Top TVL" value="$90M" hint="SYRUPUSDT pool" />
          <RwaStat label="Data source" value="DefiLlama" hint="refreshed via UI button" />
        </div>
        <div className="surface-card p-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {categories.map((c) => (
              <div
                key={c}
                className="rounded-md bg-bg-elevated/60 border border-border px-3 py-3 text-xs text-text-muted text-center"
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RwaStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-text-primary tnum">{value}</div>
      <div className="text-[11px] text-text-dim mt-0.5">{hint}</div>
    </div>
  );
}

function ReputationSection() {
  return (
    <section className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="Reputation"
          title="Agents earn trust from real outcomes"
          description="Score derives from a single atomic formula running in Postgres: proposals created, user approvals, executions completed, useful vs false alert ratio. Counters update on every event, never on promotion."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-card p-6">
            <ShieldCheck className="h-5 w-5 text-accent-sand mb-3" />
            <div className="text-sm font-medium text-text-primary mb-2">
              The score formula (server-side)
            </div>
            <pre className="text-[11px] text-text-muted leading-relaxed bg-bg-elevated/60 border border-border rounded-md p-3 overflow-x-auto">
              <code>{`score = clamp(0..100,
  50
  + (usefulAlerts - falseAlerts) * 3
  + executionsCompleted * 2
  - executionsFailed * 4
  + min(proposalsApproved, 10) * 1
  - min(proposalsRejected, 10) * 0.5
)`}</code>
            </pre>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <ReputationCard
              title="Atomic and verifiable"
              desc="Every event fires a single SQL UPDATE. No drift between displayed counters and real history."
            />
            <ReputationCard
              title="Anchored on Mantle Sepolia"
              desc="Every score recompute fires a recordReputation call to ReputationRegistry on Mantle Sepolia. Tx hash + evidence hash are public — verify any score on the explorer without trusting our backend."
            />
            <ReputationCard
              title="Useful, not promoted"
              desc="New agents start at zero. Marketplace ranking is by composite score, not recency."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ReputationCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-sm font-medium text-text-primary">{title}</div>
      <div className="text-xs text-text-muted mt-1 leading-relaxed">{desc}</div>
    </div>
  );
}

// ---------- On-chain contracts ----------
// Deployed to Mantle Sepolia (chainId 5003). Addresses are public and pinned
// here so the landing surfaces them without an API round-trip. If the
// contracts are redeployed, update both this section and the env vars.
const MANTLE_SEPOLIA_EXPLORER = "https://explorer.sepolia.mantle.xyz";
const AGENT_REGISTRY_ADDR = "0x2424600de7efb69af89ea8fd89f92fc2722adc3b";
const REPUTATION_REGISTRY_ADDR = "0x1121936f3ac5cbc97eab9c58fe2bc86123555214";
const AGENT_REGISTRATION_TXS: { slug: string; tx: string }[] = [
  { slug: "smart-wallet-tracker", tx: "0x01e717b895792ccee436f873bdc4595999982b8a25825b53c81f2c16f0afa150" },
  { slug: "rwa-yield-risk", tx: "0x287ec5ec221d4565d3327dbf6d1bfadac3b73838262e8ea71d53b1d41529837f" },
  { slug: "reputation", tx: "0xc60efd80a825043275bd23a7c9c45e9c3ad11b7c7d4923ff36dba9b89e33f984" },
  { slug: "portfolio-risk", tx: "0x0e14f652b60ec605a3e4398f49c4e3efde3acfe891fad2975d2d177528c53751" },
  { slug: "liquidity-flow", tx: "0x2f0d6bfdf6157f288cb94b72b42822bc0484ac30ff090f10ee1d86255cfb5310" },
  { slug: "token-risk", tx: "0xcb50b4973a8d8bb0d5d518d0cfddee4a60765115e24379b622e4e1cb7115de2a" },
  { slug: "whale-alert", tx: "0xb6dcf94752766ee14425c433e5cad61258c62ef8137d522c69f9a1161aed49d3" },
];

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function OnChainSection() {
  return (
    <section className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="On-chain proof"
          title="Live on Mantle Sepolia. Verifiable without our backend."
          description="The marketplace is open-source about its receipts. Every agent is registered on AgentRegistry. Every score change is anchored to ReputationRegistry. Both contracts are public. Click anything below to read state directly off Mantle Sepolia."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <a
            href={`${MANTLE_SEPOLIA_EXPLORER}/address/${AGENT_REGISTRY_ADDR}`}
            target="_blank"
            rel="noreferrer"
            className="surface-card p-5 hover:border-accent-sand/40 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-bg-elevated border border-border grid place-items-center text-accent-sand">
                <FileCode className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  AgentRegistry · Mantle Sepolia
                </div>
                <div className="text-sm font-medium text-text-primary mt-0.5">
                  Public directory of every shipped agent
                </div>
                <div className="text-xs text-text-muted mt-2 leading-relaxed">
                  Each agent registered with a keccak256 slug, owner address, and metadata URI.
                  7 agents on-chain.
                </div>
                <div className="text-[11px] tnum text-accent-sand mt-3 flex items-center gap-1 group-hover:underline">
                  {shortAddr(AGENT_REGISTRY_ADDR)} <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </a>

          <a
            href={`${MANTLE_SEPOLIA_EXPLORER}/address/${REPUTATION_REGISTRY_ADDR}`}
            target="_blank"
            rel="noreferrer"
            className="surface-card p-5 hover:border-accent-sand/40 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-bg-elevated border border-border grid place-items-center text-accent-sand">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-text-muted">
                  ReputationRegistry · Mantle Sepolia
                </div>
                <div className="text-sm font-medium text-text-primary mt-0.5">
                  Anchored score after every event
                </div>
                <div className="text-xs text-text-muted mt-2 leading-relaxed">
                  Server writes <code className="text-accent-sand">recordReputation</code> after the
                  atomic SQL recompute. Tx hash + sha256 evidence hash. No backend trust needed.
                </div>
                <div className="text-[11px] tnum text-accent-sand mt-3 flex items-center gap-1 group-hover:underline">
                  {shortAddr(REPUTATION_REGISTRY_ADDR)} <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          </a>
        </div>

        <div className="surface-card p-5">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-3">
            Agent registration transactions
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {AGENT_REGISTRATION_TXS.map((row) => (
              <a
                key={row.slug}
                href={`${MANTLE_SEPOLIA_EXPLORER}/tx/${row.tx}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-md border border-border hover:border-accent-sand/40 hover:bg-bg-soft/40 transition-colors group"
              >
                <span className="text-xs text-text-primary truncate">{row.slug}</span>
                <span className="text-[10px] tnum text-text-muted group-hover:text-accent-sand flex items-center gap-1">
                  {row.tx.slice(0, 8)}…
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function WhyMantle() {
  return (
    <section className="border-b border-border">
      <div className="container py-20">
        <SectionHeading
          eyebrow="Why Mantle"
          title="Built where on-chain finance scales"
          description="LeapVault Agent runs natively on Mantle. Low fees for high-frequency monitoring, EVM compatibility, and a growing RWA stack worth watching."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WhyCard title="Low-fee monitoring" desc="Cheap reads and writes let agents check thresholds and proofs on a tight cadence." />
          <WhyCard title="EVM-native" desc="Existing wallets, signing flows, and tooling work out of the box." />
          <WhyCard title="RWA aligned" desc="A growing surface of tokenized treasuries, credit, and yield to monitor. Ondo, Sky, Pendle, and more." />
        </div>
      </div>
    </section>
  );
}

function WhyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="surface-card p-5">
      <div className="text-sm font-medium text-text-primary">{title}</div>
      <div className="text-xs text-text-muted mt-1.5 leading-relaxed">{desc}</div>
    </div>
  );
}

function CtaSection() {
  return (
    <section>
      <div className="container py-20">
        <div className="surface-elevated p-8 sm:p-12 text-center flex flex-col items-center gap-5">
          <Badge variant="sand">
            <PlusSquare className="h-3 w-3" /> Get started in 60 seconds
          </Badge>
          <h2 className="text-display-2 font-semibold text-balance">
            Run an agent, watch a real alert, approve a proposal.
          </h2>
          <p className="text-sm text-text-muted max-w-xl leading-relaxed">
            Connect a wallet on Mantle, pick an agent, click "Run agent now". The alert appears
            seconds later with confidence, source, and a one-click proposal. Approve to walk the
            full execution loop in dry-run safety.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">Launch app <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/alerts">
                <Bell className="h-4 w-4" /> See alerts
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/proposals">
                <ClipboardList className="h-4 w-4" /> See proposals
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-[0.18em] text-accent-sand/80 mb-2">
          {eyebrow}
        </div>
        <h2 className="text-display-2 font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-text-muted mt-3 leading-relaxed">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container py-10 flex flex-col md:flex-row gap-4 md:items-center justify-between text-xs text-text-muted">
        <div>© {new Date().getFullYear()} LeapVault Agent · Mantle-native agent marketplace.</div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/business" className="hover:text-text-primary">
            <Briefcase className="h-3 w-3 inline mr-1" /> Business model
          </Link>
          <Link href="/settings" className="hover:text-text-primary">
            <Compass className="h-3 w-3 inline mr-1" /> Settings
          </Link>
          <span>Not financial advice. Verify before approving execution.</span>
        </div>
      </div>
    </footer>
  );
}

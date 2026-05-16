"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  CircleDollarSign,
  Coins,
  Compass,
  Handshake,
  LineChart,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BusinessPage() {
  return (
    <AppShell title="Business model">
      <PageHeader
        eyebrow="Business model"
        title="How LeapVault Agent becomes a business"
        description="LeapVault is an agent marketplace, not a trading bot. We earn when users hire agents, run monitoring tasks, and approve execution. Revenue is shared with agent developers. Built on Mantle."
        actions={
          <Button asChild>
            <Link href="/marketplace">
              <Compass className="h-4 w-4" /> View marketplace
            </Link>
          </Button>
        }
      />

      <Pitch />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 space-y-6">
          <RevenueStreams />
          <UserPricing />
          <ForDevelopers />
          <B2BSection />
        </div>
        <aside className="space-y-6">
          <MarketSizing />
          <Defensibility />
          <Roadmap />
          <Disclaimer />
        </aside>
      </div>
    </AppShell>
  );
}

function Pitch() {
  return (
    <div className="surface-elevated p-6 sm:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-accent-sand/80 mb-2">
            One-line pitch
          </div>
          <p className="text-lg text-text-primary leading-relaxed">
            Hire AI agents to monitor wallets, RWA yield, liquidity, and risk on Mantle. Agents
            explain what changed, propose actions, and only execute after you approve, through
            RealClaw / Byreal Skills.
          </p>
          <p className="text-sm text-text-muted mt-3 leading-relaxed max-w-2xl">
            LeapVault monitors and scores. RealClaw executes. The user remains in control. This
            split is the product, the safety guarantee, and the moat.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Agents" value="7" hint="on-chain registry" />
          <Stat label="Contracts" value="2" hint="Mantle Sepolia" />
          <Stat label="Providers" value="4" hint="AI + execution" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface-card p-3 text-center">
      <div className="text-2xl font-semibold text-text-primary tnum">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted mt-1">{label}</div>
      <div className="text-[10px] text-text-dim mt-0.5">{hint}</div>
    </div>
  );
}

function RevenueStreams() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-accent-sand" /> Revenue streams
        </CardTitle>
        <CardDescription>
          Five distinct revenue lines. Each scales with a different growth driver: users,
          tasks, executions, agents, and enterprises. The business does not depend on any
          single behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Stream
          icon={<Sparkles className="h-4 w-4" />}
          title="Agent subscriptions"
          driver="Recurring"
          body="Users pay monthly for paid agents (e.g. RWA Yield Risk, Portfolio Risk). Agent developers set the price; LeapVault takes a marketplace fee."
        />
        <Stream
          icon={<Workflow className="h-4 w-4" />}
          title="Per-task monitoring fees"
          driver="Usage-based"
          body="Granular tasks (one-off scans, deeper analyses) priced per run in MNT or USDC. Lower friction than a subscription, captures casual users."
        />
        <Stream
          icon={<Coins className="h-4 w-4" />}
          title="Execution routing fees"
          driver="Volume %"
          body="A small fee on each approved action routed through RealClaw / Byreal Skills. Aligned with user outcomes: we only earn when execution succeeds."
        />
        <Stream
          icon={<Building2 className="h-4 w-4" />}
          title="B2B / Enterprise plans"
          driver="Contracted"
          body="Funds, DAOs, and protocols license monitoring agents for treasuries, with SLA, dedicated alerts, white-label, and custom integrations."
        />
        <Stream
          icon={<Handshake className="h-4 w-4" />}
          title="Marketplace take rate"
          driver="Developer share"
          body="LeapVault retains a percentage of revenue earned by third-party agent developers in exchange for distribution, reputation, AI rails, and execution rails."
        />
      </CardContent>
    </Card>
  );
}

function Stream({
  icon,
  title,
  driver,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  driver: string;
  body: string;
}) {
  return (
    <div className="surface-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-md bg-accent-sand/15 text-accent-sand grid place-items-center">
          {icon}
        </div>
        <div className="text-sm font-medium text-text-primary flex-1">{title}</div>
        <Badge variant="muted">{driver}</Badge>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{body}</p>
    </div>
  );
}

function UserPricing() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent-sand" /> Pricing tiers (users)
        </CardTitle>
        <CardDescription>
          Indicative pricing for the public marketplace. Paid tiers unlock more concurrent
          monitoring tasks, higher AI call limits, and access to subscription-priced agents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Tier
            name="Free"
            price="0"
            unit="forever"
            features={[
              "1 active monitoring task",
              "All free-tier agents",
              "100 AI calls / day",
              "Manual provider only",
            ]}
          />
          <Tier
            name="Plus"
            price="9"
            unit="MNT / month"
            badge="Most popular"
            features={[
              "10 active tasks",
              "All subscription agents",
              "500 AI calls / day",
              "Telegram + email alerts",
            ]}
          />
          <Tier
            name="Pro"
            price="29"
            unit="MNT / month"
            features={[
              "Unlimited tasks",
              "Priority AI routing",
              "Execution via RealClaw / Byreal",
              "Custom risk thresholds",
            ]}
          />
          <Tier
            name="Enterprise"
            price="Custom"
            unit="contracted"
            features={[
              "Dedicated agents",
              "SLA + dedicated infra",
              "White-label alerts",
              "On-chain proof anchoring",
            ]}
          />
        </div>
        <p className="text-xs text-text-muted mt-4 leading-relaxed">
          Prices shown are <span className="text-text-primary">indicative</span>. The
          marketplace currently runs in free mode while we validate willingness to pay across
          the seeded agent set. No payments are processed today.
        </p>
      </CardContent>
    </Card>
  );
}

function Tier({
  name,
  price,
  unit,
  badge,
  features,
}: {
  name: string;
  price: string;
  unit: string;
  badge?: string;
  features: string[];
}) {
  return (
    <div className="surface-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-text-muted">{name}</div>
          <div className="mt-1 text-2xl font-semibold text-text-primary tnum">{price}</div>
          <div className="text-[11px] text-text-dim mt-0.5">{unit}</div>
        </div>
        {badge ? <Badge variant="sand">{badge}</Badge> : null}
      </div>
      <ul className="text-xs text-text-muted space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex gap-1.5 items-start">
            <span className="text-accent-sage mt-0.5">·</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ForDevelopers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-accent-sand" /> For agent developers
        </CardTitle>
        <CardDescription>
          Anyone can deploy a monitoring agent. LeapVault provides the distribution, reputation,
          AI rails, execution rails, and billing. The developer focuses on the signal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Pair label="Marketplace take rate" value="15% of agent revenue" />
          <Pair label="Settlement" value="Weekly in MNT or USDC" />
          <Pair label="Reputation" value="Built from real user outcomes" />
          <Pair label="Distribution" value="Marketplace + Alpha Feed surfacing" />
        </div>
        <p className="text-xs text-text-muted leading-relaxed">
          Reputation compounds. Agents that produce useful, source-cited alerts and successful
          approval-gated executions surface higher in marketplace ranking. The protocol does
          not promote new agents over high reputation ones. Quality wins.
        </p>
      </CardContent>
    </Card>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}

function B2BSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent-sand" /> B2B: funds, DAOs, protocols
        </CardTitle>
        <CardDescription>
          The same agent runtime powers enterprise monitoring for treasuries, lending books,
          and RWA portfolios. Higher leverage, longer contracts, deeper integrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Use
          who="Small funds / family offices"
          what="Continuous risk monitoring of held assets, with explainable alerts and approval-gated rebalances."
        />
        <Use
          who="DAO treasuries"
          what="Multi-sig-aware monitoring of stable-yield positions and RWA exposure; alerts routed to the DAO's Discord / Telegram."
        />
        <Use
          who="Protocols with on-chain treasuries"
          what="Embedded LeapVault dashboards; agents tuned to the protocol's specific risk surface (oracle drift, redemption pressure, liquidity depth)."
        />
        <Use
          who="Auditors and reporting firms"
          what="On-chain proof anchoring + signed reputation history; agent outputs can be cited in audit trails."
        />
      </CardContent>
    </Card>
  );
}

function Use({ who, what }: { who: string; what: string }) {
  return (
    <div className="surface-card p-4">
      <div className="text-sm font-medium text-text-primary">{who}</div>
      <div className="text-xs text-text-muted mt-1 leading-relaxed">{what}</div>
    </div>
  );
}

function MarketSizing() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-4 w-4 text-accent-sand" /> Why this is a business
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-text-muted space-y-2 leading-relaxed">
        <p>
          On-chain monitoring tools today either lie (autonomous traders that promise outcomes
          they cannot guarantee) or are dumb (RSS feeds of transactions). The market for
          calibrated, explainable, approval-gated monitoring is open.
        </p>
        <p>
          RWA on-chain TVL is growing. Ondo, Sky, Ethena, Maple, Centrifuge each manage
          billions. Mantle's RWA stack is early but real. Surfacing this safely is a product.
        </p>
        <p>
          Every alert that produces a real action through RealClaw / Byreal is an outcome
          LeapVault can earn on without taking custody.
        </p>
      </CardContent>
    </Card>
  );
}

function Defensibility() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent-sand" /> Defensibility
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-text-muted space-y-2 leading-relaxed">
        <p>
          <span className="text-text-primary">Reputation moat.</span> Scores derive from real
          outcomes: proposals created, user approvals, executions completed. New entrants
          start at zero. This compounds.
        </p>
        <p>
          <span className="text-text-primary">Mantle-native fit.</span> RealClaw / Byreal
          Skills integration is wired at the architecture layer, not bolted on.
        </p>
        <p>
          <span className="text-text-primary">AI-provider neutral.</span> Routes across
          NVIDIA, Ollama, OpenAI. No single model lock-in or single vendor exposure.
        </p>
        <p>
          <span className="text-text-primary">Regulatory posture.</span> Approval-gated and
          source-cited. The user is always in control. No unauthorized fund movement, ever.
        </p>
        <p>
          <span className="text-text-primary">On-chain receipts.</span> AgentRegistry and
          ReputationRegistry live on Mantle Sepolia. Scores anchor to L2 after every event.
          Competitors can't fake their numbers; we can't fake ours.
        </p>
      </CardContent>
    </Card>
  );
}

function Roadmap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What's next</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-text-muted space-y-2 leading-relaxed">
        <RoadmapRow stage="Now" text="Marketplace, monitoring, execution rails, reputation, on-chain anchoring on Mantle Sepolia." />
        <RoadmapRow stage="Q3" text="Agent developer SDK, mainnet contract deployment, paid tier billing." />
        <RoadmapRow stage="Q4" text="B2B pilot with one DAO treasury and one fund." />
        <RoadmapRow stage="2027" text="Cross-chain monitoring, RWA-specific risk benchmarks, partner network." />
      </CardContent>
    </Card>
  );
}

function RoadmapRow({ stage, text }: { stage: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-[10px] uppercase tracking-wider text-accent-sand/80 w-12 shrink-0 pt-0.5">
        {stage}
      </div>
      <div className="flex-1">{text}</div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="surface-card p-4 border-dashed text-[11px] text-text-muted leading-relaxed">
      Nothing on this page is financial advice or an offer to sell securities. Pricing and
      roadmap items are forward-looking and subject to change. AI-generated analysis can be
      wrong. Always verify before approving an execution.
    </div>
  );
}

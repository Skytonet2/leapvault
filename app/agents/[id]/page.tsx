"use client";

import * as React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronLeft,
  PlusSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { AgentIcon } from "@/components/agents/AgentIcon";
import { AgentStatusBadge } from "@/components/agents/AgentStatusBadge";
import { ReputationScore } from "@/components/agents/ReputationScore";
import { AgentExecutionCapabilities } from "@/components/agents/AgentExecutionCapabilities";
import { RunAgentButton } from "@/components/agents/RunAgentButton";
import { useWallet } from "@/hooks/useWallet";
import { AGENT_CATEGORY_LABEL, type Agent } from "@/types/agent";
import type { ServiceResult } from "@/types/common";
import { shortAddress } from "@/lib/utils/format";
import { explorerLink, getDefaultChain } from "@/lib/chains/mantle";
import { SubscribeCard } from "@/components/subscription/SubscribeCard";

async function fetchAgent(slug: string): Promise<ServiceResult<Agent>> {
  const res = await fetch(`/api/agents/${slug}`, { cache: "no-store" });
  return (await res.json()) as ServiceResult<Agent>;
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const slug = params?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["agent", slug],
    queryFn: () => fetchAgent(slug as string),
    enabled: Boolean(slug),
  });

  if (!slug) {
    notFound();
  }

  return (
    <AppShell title="Agent profile">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketplace">
            <ChevronLeft className="h-4 w-4" /> Back to marketplace
          </Link>
        </Button>
      </div>

      {isLoading ? <ProfileSkeleton /> : null}
      {data && !data.ok ? <ErrorState error={data.error} setupHref="/settings" /> : null}
      {data && data.ok ? <Profile agent={data.data} /> : null}
    </AppShell>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 w-full lg:col-span-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

function Profile({ agent }: { agent: Agent }) {
  const wallet = useWallet();
  return (
    <>
      <PageHeader
        eyebrow={AGENT_CATEGORY_LABEL[agent.category]}
        title={agent.name}
        description={agent.description}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/tasks/new?agent=${agent.id}`}>
                <PlusSquare className="h-4 w-4" /> Create task
              </Link>
            </Button>
            <RunAgentButton agentSlug={agent.slug} wallet={wallet.address} />
          </>
        }
      />

      <div className="surface-card p-5 flex flex-wrap items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-lg bg-bg-elevated border border-border grid place-items-center text-accent-sand">
          <AgentIcon category={agent.category} className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">{agent.name}</h2>
            <AgentStatusBadge status={agent.status} />
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {agent.walletAddress ? (
              <>On-chain identity: <span className="tnum">{shortAddress(agent.walletAddress)}</span></>
            ) : (
              "Off-chain agent"
            )}
          </div>
        </div>
        <ReputationScore
          score={agent.reputation.score}
          totalTasks={agent.reputation.totalTasks}
          size="lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>What this agent can monitor and report on.</CardDescription>
            </CardHeader>
            <CardContent>
              {agent.skills.length === 0 ? (
                <p className="text-sm text-text-muted">No skills listed.</p>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agent.skills.map((s) => (
                    <li key={s.id} className="surface-card p-4">
                      <div className="text-sm font-medium text-text-primary">{s.label}</div>
                      {s.description ? (
                        <div className="text-xs text-text-muted mt-1 leading-relaxed">
                          {s.description}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <AgentExecutionCapabilities agentSlug={agent.slug} />

          <Card>
            <CardHeader>
              <CardTitle>Reputation</CardTitle>
              <CardDescription>
                Calculated from real outcomes: proposals created, user approvals, executions
                completed, and useful-vs-false alert ratio. Updated atomically after every event.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <RepStat label="Total tasks" value={agent.reputation.totalTasks} />
                <RepStat label="Completed" value={agent.reputation.completedTasks} />
                <RepStat
                  label="Useful alerts"
                  value={agent.reputation.usefulAlertCount}
                />
                <RepStat label="False alerts" value={agent.reputation.falseAlertReports} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
                  Execution outcomes
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <RepStat
                    label="Proposals created"
                    value={agent.reputation.proposalsCreated}
                  />
                  <RepStat
                    label="Approved"
                    value={agent.reputation.proposalsApproved}
                  />
                  <RepStat
                    label="Completed"
                    value={agent.reputation.executionsCompleted}
                  />
                  <RepStat
                    label="Failed"
                    value={agent.reputation.executionsFailed}
                  />
                </div>
              </div>
              {agent.reputation.score === null ? (
                <p className="text-xs text-text-muted">
                  This agent has not produced enough activity to generate a performance score.
                </p>
              ) : (
                <div className="text-xs text-text-muted space-y-1">
                  <p>
                    Composite score: <span className="tnum text-text-primary">{agent.reputation.score}</span>/100.
                  </p>
                  {agent.reputation.onchainProofHash ? (
                    <>
                      <p>
                        <span className="inline-flex items-center gap-1 text-signal-ok">
                          <ShieldCheck className="h-3 w-3" /> Anchored on {getDefaultChain().name}
                        </span>
                        {" · "}
                        <a
                          href={explorerLink(
                            getDefaultChain().id,
                            "tx",
                            agent.reputation.onchainProofHash,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent-sand hover:underline tnum"
                        >
                          {shortAddress(agent.reputation.onchainProofHash)}
                          <ArrowUpRight className="inline h-3 w-3 ml-0.5" />
                        </a>
                      </p>
                      <p>
                        <a
                          href={`/api/agents/${agent.slug}/reputation/proof`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent-sand hover:underline"
                        >
                          Verify proof
                          <ArrowUpRight className="inline h-3 w-3 ml-0.5" />
                        </a>
                        <span className="text-text-dim ml-1">
                          (returns the breakdown JSON whose sha256 matches the on-chain evidenceHash)
                        </span>
                      </p>
                    </>
                  ) : (
                    <p>On-chain proof not yet anchored.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert examples</CardTitle>
              <CardDescription>
                Recent alerts produced by this agent. Sample alerts appear only once the agent has completed real tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">
                No alert history is available yet. Hire this agent and create a monitoring task to see real alerts here.
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <SubscribeCard agentSlug={agent.slug} agentName={agent.name} />
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-text-muted">
                {agent.pricing.model === "free"
                  ? "Free to use"
                  : agent.pricing.amount && agent.pricing.currency
                    ? `${agent.pricing.amount} ${agent.pricing.currency}${agent.pricing.unit ? ` / ${agent.pricing.unit}` : ""}`
                    : "Custom. Contact the agent owner."}
              </div>
              <Badge variant="muted">{agent.pricing.model}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Networks</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {agent.supportedNetworks.length === 0 ? (
                <span className="text-sm text-text-muted">—</span>
              ) : (
                agent.supportedNetworks.map((n) => (
                  <Badge key={n} variant="sage">
                    {n === 5000 ? "Mantle" : n === 5003 ? "Mantle Sepolia" : `Chain ${n}`}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to verify</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-muted">
              <p className="flex gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-sand shrink-0 mt-0.5" />
                Each alert this agent produces is signed with a confidence score and a source link.
              </p>
              <p className="flex gap-2">
                <Sparkles className="h-4 w-4 text-accent-sage shrink-0 mt-0.5" />
                Reputation updates are derived from real task outcomes, not self-reported metrics.
              </p>
              {agent.walletAddress ? (
                <Link
                  href={`https://explorer.sepolia.mantle.xyz/address/${agent.walletAddress}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-accent-sand hover:underline text-xs"
                >
                  View on explorer <ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function RepStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-base font-semibold tnum">{value}</div>
    </div>
  );
}

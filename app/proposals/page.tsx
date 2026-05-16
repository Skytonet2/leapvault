"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExecutionProposalCard } from "@/components/execution/ExecutionProposalCard";
import { useWallet } from "@/hooks/useWallet";
import type { ExecutionProposal } from "@/lib/execution/types";
import type { ServiceResult } from "@/types/common";

async function fetchProposals(wallet: `0x${string}`): Promise<ServiceResult<ExecutionProposal[]>> {
  const res = await fetch(`/api/execution/proposals?wallet=${wallet}`, { cache: "no-store" });
  return (await res.json()) as ServiceResult<ExecutionProposal[]>;
}

async function fetchExecutionStatus() {
  const res = await fetch("/api/execution/status", { cache: "no-store" });
  return (await res.json()) as {
    ok: true;
    data: {
      mode: { approvalRequired: boolean; dryRun: boolean };
      defaultProvider: string;
      providers: Array<{ health: { provider: string; status: string; message: string } }>;
    };
  };
}

export default function ProposalsPage() {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const proposals = useQuery({
    queryKey: ["proposals", wallet.address],
    queryFn: () => fetchProposals(wallet.address as `0x${string}`),
    enabled: Boolean(wallet.address),
  });
  const status = useQuery({
    queryKey: ["execution-status-mini"],
    queryFn: fetchExecutionStatus,
    refetchInterval: 30_000,
  });

  const list = proposals.data?.ok ? proposals.data.data : [];

  const latest = list[0];
  const lastApproved = list.find((p) => p.userApprovedAt);
  const lastFailed = list.find((p) => p.status === "failed");
  const lastCompleted = list.find((p) => p.status === "completed");

  return (
    <AppShell title="Action proposals">
      <PageHeader
        eyebrow="Execution Layer"
        title="Action proposals"
        description="Agents create proposals from real alerts. You review every action before LeapVault routes it to RealClaw or Byreal Skills. No execution happens without approval."
      />

      {!wallet.isConnected ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Connect your wallet to see proposals"
          description="Proposals are tied to the wallet that created the task or received the alert."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {proposals.isLoading ? (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            ) : proposals.data && !proposals.data.ok ? (
              <ErrorState error={proposals.data.error} setupHref="/settings" />
            ) : list.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-5 w-5" />}
                title="No proposals yet"
                description="When an alert produces an executable action, create a proposal from the alert. Approved proposals route to your configured execution provider."
                action={{ label: "View alerts", href: "/alerts" }}
              />
            ) : (
              list.map((p) => (
                <ExecutionProposalCard
                  key={p.id}
                  proposal={p}
                  wallet={wallet.address}
                  onChanged={() => {
                    queryClient.invalidateQueries({ queryKey: ["proposals", wallet.address] });
                  }}
                />
              ))
            )}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demo Evidence</CardTitle>
                <CardDescription>
                  Quick snapshot judges can verify in a few seconds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <EvidenceRow label="Latest proposal" value={latest?.id ?? "—"} />
                <EvidenceRow label="Latest approved" value={lastApproved?.id ?? "—"} />
                <EvidenceRow label="Latest completed" value={lastCompleted?.id ?? "—"} />
                <EvidenceRow label="Latest failed" value={lastFailed?.id ?? "—"} />
                <EvidenceRow
                  label="Execution mode"
                  value={
                    status.data
                      ? `${status.data.data.mode.approvalRequired ? "approval_required" : "auto"} · ${status.data.data.mode.dryRun ? "dry_run=true" : "dry_run=false"}`
                      : "—"
                  }
                />
                <EvidenceRow
                  label="Default provider"
                  value={status.data?.data.defaultProvider ?? "—"}
                />
                <div className="pt-2 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
                    Providers
                  </div>
                  <div className="flex flex-col gap-1">
                    {status.data?.data.providers.map((p) => (
                      <div key={p.health.provider} className="flex items-center justify-between">
                        <span className="text-text-primary capitalize">{p.health.provider}</span>
                        <Badge
                          variant={
                            p.health.status === "online"
                              ? "ok"
                              : p.health.status === "not-configured"
                                ? "muted"
                                : "warn"
                          }
                        >
                          {p.health.status}
                        </Badge>
                      </div>
                    )) ?? null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How execution works</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-text-muted space-y-2 leading-relaxed">
                <p>1. Agent monitors the wallet, asset, or pool you assigned.</p>
                <p>2. Alert explains what changed, the source, and the risk.</p>
                <p>3. You convert the alert to a proposal (or dismiss it).</p>
                <p>4. You review and approve. High-risk actions require an explicit acknowledgement.</p>
                <p>5. LeapVault routes the approved proposal to RealClaw / Byreal Skills.</p>
                <p>6. Result is recorded; agent reputation updates.</p>
                <p className="pt-2">
                  <Link className="text-accent-sand hover:underline" href="/settings">
                    Configure provider →
                  </Link>
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </AppShell>
  );
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-text-muted">{label}</div>
      <div className="text-text-primary tnum text-right break-all">{value}</div>
    </div>
  );
}

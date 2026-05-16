"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, CircleDot, CircleOff, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTION_TYPE_LABEL,
  PROVIDER_LABEL,
  type ExecutionCapability,
  type ExecutionProviderName,
  type ProviderHealth,
} from "@/lib/execution/types";

interface StatusResponse {
  ok: true;
  data: {
    mode: { approvalRequired: boolean; dryRun: boolean; timeoutMs: number; retryLimit: number };
    defaultProvider: string;
    providers: Array<{ health: ProviderHealth; capabilities: ExecutionCapability[] }>;
  };
}

async function fetchStatus(): Promise<StatusResponse> {
  const res = await fetch("/api/execution/status", { cache: "no-store" });
  return (await res.json()) as StatusResponse;
}

export function ExecutionProviderStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["execution-status"],
    queryFn: fetchStatus,
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-accent-sand" /> Execution Layer
        </CardTitle>
        <CardDescription>
          LeapVault monitors, explains, and scores. RealClaw / Byreal Skills execute after user
          approval.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <Badge variant="sand">
                Default: {PROVIDER_LABEL[data.data.defaultProvider as ExecutionProviderName] ?? data.data.defaultProvider}
              </Badge>
              <Badge variant={data.data.mode.approvalRequired ? "sage" : "warn"}>
                {data.data.mode.approvalRequired ? "Approval required" : "Auto-execute"}
              </Badge>
              <Badge variant={data.data.mode.dryRun ? "muted" : "ok"}>
                {data.data.mode.dryRun ? "Dry run on" : "Live execution"}
              </Badge>
            </div>
            <div className="space-y-2">
              {data.data.providers.map((p) => (
                <ProviderRow key={p.health.provider} provider={p} />
              ))}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              AI-generated proposals can be wrong. Every execution must pass through user approval.
              No transaction is sent in dry-run mode.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderRow({
  provider,
}: {
  provider: { health: ProviderHealth; capabilities: ExecutionCapability[] };
}) {
  const { health, capabilities } = provider;
  return (
    <div className="rounded-md border border-border bg-bg-elevated/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-text-primary flex items-center gap-2">
            <StatusDot status={health.status} />
            {PROVIDER_LABEL[health.provider]}
          </div>
          <div className="text-xs text-text-muted mt-0.5 truncate">{health.message}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={health.status} />
          {health.latencyMs !== null ? (
            <span className="text-[10px] text-text-dim tnum">{health.latencyMs}ms</span>
          ) : null}
        </div>
      </div>
      {capabilities.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {capabilities.map((c) => (
            <Badge key={c.actionType} variant={c.verified ? "sage" : "muted"}>
              {ACTION_TYPE_LABEL[c.actionType]}
              {c.verified ? null : <span className="ml-1 text-[10px]">(unverified)</span>}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusDot({ status }: { status: ProviderHealth["status"] }) {
  if (status === "online") return <CircleCheck className="h-3.5 w-3.5 text-signal-ok" />;
  if (status === "degraded") return <CircleAlert className="h-3.5 w-3.5 text-signal-warn" />;
  if (status === "offline") return <CircleAlert className="h-3.5 w-3.5 text-signal-risk" />;
  if (status === "not-configured") return <CircleOff className="h-3.5 w-3.5 text-text-dim" />;
  return <CircleDot className="h-3.5 w-3.5 text-text-dim" />;
}

function StatusBadge({ status }: { status: ProviderHealth["status"] }) {
  switch (status) {
    case "online":
      return <Badge variant="ok">Online</Badge>;
    case "degraded":
      return <Badge variant="warn">Degraded</Badge>;
    case "offline":
      return <Badge variant="risk">Offline</Badge>;
    case "not-configured":
      return <Badge variant="muted">Not configured</Badge>;
    default:
      return <Badge variant="muted">Unknown</Badge>;
  }
}

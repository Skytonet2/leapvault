"use client";

import * as React from "react";
import { Bell, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCard } from "@/components/alerts/AlertCard";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useUserAlerts } from "@/hooks/useAlerts";
import { cn } from "@/lib/utils/cn";
import type { Alert } from "@/types/alert";
import { RunAgentButton } from "@/components/agents/RunAgentButton";

type Filter = "all" | "unread" | "high-risk" | "rwa" | "wallets" | "liquidity" | "token";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "high-risk", label: "High risk" },
  { id: "rwa", label: "RWA" },
  { id: "wallets", label: "Wallets" },
  { id: "liquidity", label: "Liquidity" },
  { id: "token", label: "Token risk" },
];

export default function AlertsPage() {
  const wallet = useWallet();
  const { data, isLoading } = useUserAlerts(wallet.address);
  const [filter, setFilter] = React.useState<Filter>("all");

  const all = data?.ok ? data.data : [];
  const list = applyFilter(all, filter);

  return (
    <AppShell title="Alerts">
      <PageHeader
        eyebrow="Alerts"
        title="Every signal, with a source"
        description="All alerts produced by hired agents. Each carries a confidence score and a data source, never just a vibe."
      />

      {!wallet.isConnected ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Connect your wallet to see alerts"
          description="Alerts are scoped to the wallet that created the task."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {FILTERS.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={filter === f.id ? "secondary" : "ghost"}
                onClick={() => setFilter(f.id)}
                className={cn("rounded-full text-xs", filter === f.id && "border-accent-sand/40")}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : data && !data.ok ? (
            <ErrorState error={data.error} setupHref="/settings" />
          ) : list.length === 0 ? (
            <div className="surface-card p-8 sm:p-10 flex flex-col items-center gap-4 text-center border-dashed">
              <div className="h-12 w-12 rounded-full flex items-center justify-center bg-bg-elevated text-accent-sand">
                <Bell className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="text-base font-medium text-text-primary">No alerts yet</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Trigger an agent run to produce a real, AI-explained alert tied to live Mantle
                  data. Or create a monitoring task to schedule recurring scans.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-1 items-start">
                <RunAgentButton agentSlug="rwa-yield-risk" wallet={wallet.address} label="Run RWA Yield Agent" />
                <RunAgentButton agentSlug="smart-wallet-tracker" wallet={wallet.address} variant="outline" label="Run Smart Wallet Tracker" />
                <Button variant="outline" asChild>
                  <a href="/tasks/new">Create a task</a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <AlertCard key={a.id} alert={a} wallet={wallet.address} />
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

function applyFilter(list: Alert[], filter: Filter): Alert[] {
  switch (filter) {
    case "all":
      return list;
    case "unread":
      return list.filter((a) => !a.readAt);
    case "high-risk":
      return list.filter((a) => a.severity === "high" || a.severity === "critical");
    case "rwa":
      return list.filter((a) => a.type === "rwa-yield-change");
    case "wallets":
      return list.filter((a) => a.type === "wallet-movement" || a.type === "whale-trade");
    case "liquidity":
      return list.filter((a) => a.type === "liquidity-drop");
    case "token":
      return list.filter((a) => a.type === "token-anomaly" || a.type === "risk-warning");
  }
}

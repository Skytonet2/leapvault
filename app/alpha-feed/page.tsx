"use client";

import { Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCard } from "@/components/alerts/AlertCard";
import { useWallet } from "@/hooks/useWallet";
import { useUserAlerts } from "@/hooks/useAlerts";

export default function AlphaFeedPage() {
  const wallet = useWallet();
  const { data, isLoading } = useUserAlerts(wallet.address);
  const alerts = data?.ok ? data.data : [];

  return (
    <AppShell title="Alpha Feed">
      <PageHeader
        eyebrow="Live signals"
        title="Alpha Feed"
        description="A live stream of signals discovered by agents you've hired. Wallet movements, whale trades, yield shifts, liquidity drops, and risk warnings."
      />

      {!wallet.isConnected ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="No live signals yet"
          description="Connect your wallet and hire an agent. Discovered signals will appear here with confidence, source, and explanation."
          action={{ label: "Browse agents", href: "/marketplace" }}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : data && !data.ok ? (
        <ErrorState error={data.error} setupHref="/settings" />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="No live signals yet"
          description="Hire an agent or create a monitoring task. The Alpha Feed surfaces signals as they are produced. No demo entries are shown."
          action={{ label: "Create a task", href: "/tasks/new" }}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} wallet={wallet.address} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

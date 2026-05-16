"use client";

import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Building2,
  PlusSquare,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCard } from "@/components/alerts/AlertCard";
import { useWallet } from "@/hooks/useWallet";
import { useUserTasks } from "@/hooks/useTasks";
import { useUserAlerts } from "@/hooks/useAlerts";
import { useAgents } from "@/hooks/useAgents";
import { useRwaAssets } from "@/hooks/useRwaAssets";

export default function DashboardPage() {
  const wallet = useWallet();
  const address = wallet.address;

  const tasks = useUserTasks(address);
  const alerts = useUserAlerts(address);
  const agents = useAgents();
  const rwa = useRwaAssets();

  const taskList = tasks.data?.ok ? tasks.data.data : [];
  const alertList = alerts.data?.ok ? alerts.data.data : [];
  const agentList = agents.data?.ok ? agents.data.data : [];
  const rwaList = rwa.data?.ok ? rwa.data.data : [];

  const unreadAlerts = alertList.filter((a) => !a.readAt).length;
  const highRisk = alertList.filter(
    (a) => a.severity === "high" || a.severity === "critical",
  ).length;
  const activeAgentIds = new Set(taskList.map((t) => t.agentId));

  return (
    <AppShell title="Dashboard" description="Hired agents, monitored assets, and live signals.">
      <PageHeader
        eyebrow="Control center"
        title="Welcome back"
        description="A clear overview of your hired agents, tasks, alerts, and monitored real-world assets."
        actions={
          <Button asChild>
            <Link href="/tasks/new">
              <PlusSquare className="h-4 w-4" /> Create task
            </Link>
          </Button>
        }
      />

      {!wallet.isConnected ? (
        <EmptyState
          variant="setup"
          icon={<Wallet className="h-5 w-5" />}
          title="Connect your wallet"
          description="Connect a wallet on Mantle to hire agents, create monitoring tasks, and receive alerts."
          action={{ label: "Connect via top bar", onClick: () => {} }}
          secondary={{ label: "Browse agents", href: "/marketplace" }}
          className="mb-8"
        />
      ) : null}

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        <StatCard
          label="Active agents"
          value={tasks.isLoading ? <Skeleton className="h-7 w-12" /> : activeAgentIds.size || "—"}
          hint={wallet.isConnected ? "Across your tasks" : "Connect wallet"}
          icon={<Bot className="h-4 w-4" />}
        />
        <StatCard
          label="Running tasks"
          value={tasks.isLoading ? <Skeleton className="h-7 w-12" /> : taskList.length || "—"}
          hint={wallet.isConnected ? "All monitoring jobs" : "Connect wallet"}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Unread alerts"
          value={alerts.isLoading ? <Skeleton className="h-7 w-12" /> : unreadAlerts || "—"}
          hint={wallet.isConnected ? "Awaiting review" : "Connect wallet"}
          icon={<Bell className="h-4 w-4" />}
        />
        <StatCard
          label="High-risk signals"
          value={alerts.isLoading ? <Skeleton className="h-7 w-12" /> : highRisk || "—"}
          hint="High + critical severity"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Monitored RWA"
          value={rwa.isLoading ? <Skeleton className="h-7 w-12" /> : rwaList.length || "—"}
          hint="Across registered assets"
          icon={<Building2 className="h-4 w-4" />}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-3">
          <SectionTitle title="Latest alerts" href="/alerts" />
          {!wallet.isConnected ? (
            <EmptyState
              title="No alerts yet"
              description="Connect your wallet and create a task. Your agent will notify you when important signals appear."
              action={{ label: "Create your first task", href: "/tasks/new" }}
            />
          ) : alerts.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : alerts.data && !alerts.data.ok ? (
            <ErrorState error={alerts.data.error} setupHref="/settings" />
          ) : alertList.length === 0 ? (
            <EmptyState
              title="No alerts yet"
              description="When your agents detect monitored conditions, alerts will appear here with source links and confidence."
              action={{ label: "Create a task", href: "/tasks/new" }}
            />
          ) : (
            alertList.slice(0, 5).map((a) => <AlertCard key={a.id} alert={a} wallet={address} />)
          )}
        </section>

        <aside className="space-y-6">
          <section>
            <SectionTitle title="Available agents" href="/marketplace" />
            {agents.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : agents.data && !agents.data.ok ? (
              <ErrorState error={agents.data.error} setupHref="/settings" />
            ) : agentList.length === 0 ? (
              <EmptyState
                title="No agents registered yet"
                description="Register an agent or connect the AgentRegistry contract."
                action={{ label: "View setup", href: "/settings" }}
              />
            ) : (
              <ul className="space-y-2">
                {agentList.slice(0, 4).map((a) => (
                  <li key={a.id} className="surface-card p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-bg-elevated border border-border grid place-items-center text-accent-sand">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-primary truncate">{a.name}</div>
                      <div className="text-xs text-text-muted truncate">
                        {a.description}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/agents/${a.slug}`}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionTitle title="RWA watchlist" href="/rwa-monitor" />
            {rwa.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : rwa.data && !rwa.data.ok ? (
              <ErrorState error={rwa.data.error} setupHref="/settings" />
            ) : rwaList.length === 0 ? (
              <EmptyState
                title="No RWA assets tracked"
                description="Configure the RWA adapter to begin monitoring real-world assets on Mantle."
                action={{ label: "Open RWA Monitor", href: "/rwa-monitor" }}
              />
            ) : (
              <ul className="space-y-2">
                {rwaList.slice(0, 4).map((r) => (
                  <li key={r.id} className="surface-card p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-bg-elevated border border-border grid place-items-center text-accent-sage">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-primary truncate">{r.name}</div>
                      <div className="text-xs text-text-muted truncate">{r.symbol}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-medium text-text-primary">{title}</h2>
      <Link href={href} className="text-xs text-text-muted hover:text-accent-sand">
        View all →
      </Link>
    </div>
  );
}

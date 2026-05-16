"use client";

import Link from "next/link";
import { Bot, Pause, Play, PlusSquare, Wallet, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { useUserTasks } from "@/hooks/useTasks";
import { useAgents } from "@/hooks/useAgents";
import { TASK_TYPE_LABEL, type Task } from "@/types/task";
import type { Agent } from "@/types/agent";
import { formatRelativeTime, shortAddress } from "@/lib/utils/format";

export default function MyAgentsPage() {
  const wallet = useWallet();
  const tasks = useUserTasks(wallet.address);
  const agentsQuery = useAgents();

  const taskList = tasks.data?.ok ? tasks.data.data : [];
  const agents = agentsQuery.data?.ok ? agentsQuery.data.data : [];
  const agentById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const running = taskList.filter((t) => t.status === "active" || t.status === "pending");
  const paused = taskList.filter((t) => t.status === "paused");
  const completed = taskList.filter((t) => t.status === "completed" || t.status === "failed");

  return (
    <AppShell title="My Agents">
      <PageHeader
        eyebrow="Your hires"
        title="My agents"
        description="The agents you've hired, the tasks running, and their outcomes, all in one place."
        actions={
          <Button asChild>
            <Link href="/tasks/new">
              <PlusSquare className="h-4 w-4" /> New task
            </Link>
          </Button>
        }
      />

      {!wallet.isConnected ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Connect your wallet"
          description="Your hired agents and tasks are scoped to your wallet."
        />
      ) : tasks.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : tasks.data && !tasks.data.ok ? (
        <ErrorState error={tasks.data.error} setupHref="/settings" />
      ) : taskList.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-5 w-5" />}
          title="Hire your first agent"
          description="Pick a specialized agent and create a monitoring task. It only takes a minute."
          action={{ label: "Browse marketplace", href: "/marketplace" }}
          secondary={{ label: "Create task", href: "/tasks/new" }}
        />
      ) : (
        <div className="space-y-8">
          <Section title="Running" items={running} agentById={agentById} statusVariant="ok" />
          <Section title="Paused" items={paused} agentById={agentById} statusVariant="warn" />
          <Section title="Completed" items={completed} agentById={agentById} statusVariant="muted" />
        </div>
      )}
    </AppShell>
  );
}

function Section({
  title,
  items,
  agentById,
  statusVariant,
}: {
  title: string;
  items: Task[];
  agentById: Record<string, Agent>;
  statusVariant: "ok" | "warn" | "muted";
}) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-text-primary mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((t) => {
          const agent = agentById[t.agentId];
          return (
            <article key={t.id} className="surface-card p-4 flex flex-col gap-3">
              <header className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-bg-elevated border border-border grid place-items-center text-accent-sand">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-text-primary truncate">
                      {agent?.name ?? "Unknown agent"}
                    </h3>
                    <Badge variant={statusVariant}>{t.status}</Badge>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {TASK_TYPE_LABEL[t.taskType]}
                  </div>
                </div>
              </header>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <dt className="text-text-muted">Target</dt>
                <dd className="text-text-primary font-mono tnum truncate">
                  {t.targetAddress ? shortAddress(t.targetAddress) : t.targetSymbol ?? "—"}
                </dd>
                <dt className="text-text-muted">Frequency</dt>
                <dd className="text-text-primary capitalize">{t.frequency}</dd>
                <dt className="text-text-muted">Created</dt>
                <dd className="text-text-primary">{formatRelativeTime(t.createdAt)}</dd>
              </dl>
              <footer className="flex items-center gap-2 pt-2 border-t border-border">
                <Button size="sm" variant="ghost">
                  {t.status === "paused" ? (
                    <>
                      <Play className="h-3.5 w-3.5" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" /> Pause
                    </>
                  )}
                </Button>
                <Button size="sm" variant="ghost">
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </footer>
            </article>
          );
        })}
      </div>
    </section>
  );
}

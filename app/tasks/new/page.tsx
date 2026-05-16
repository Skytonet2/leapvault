"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronLeft, PlusSquare, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWallet } from "@/hooks/useWallet";
import { useAgents } from "@/hooks/useAgents";
import { useCreateTask } from "@/hooks/useTasks";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validators/task";
import { TASK_TYPE_LABEL } from "@/types/task";
import { Badge } from "@/components/ui/badge";

const NETWORK_OPTIONS = [
  { id: 5000, label: "Mantle" },
  { id: 5003, label: "Mantle Sepolia" },
];

const TARGET_TYPES = [
  { id: "wallet", label: "Wallet" },
  { id: "token", label: "Token" },
  { id: "asset", label: "RWA asset" },
  { id: "portfolio", label: "Portfolio" },
] as const;

const FREQUENCIES = [
  { id: "realtime", label: "Realtime" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
] as const;

const ALERT_CHANNELS = [
  { id: "in-app", label: "In-app" },
  { id: "telegram", label: "Telegram" },
  { id: "discord", label: "Discord" },
  { id: "email", label: "Email" },
] as const;

export default function NewTaskPage() {
  return (
    <React.Suspense fallback={<NewTaskFallback />}>
      <NewTaskForm />
    </React.Suspense>
  );
}

function NewTaskFallback() {
  return (
    <AppShell title="Create task">
      <PageHeader
        eyebrow="Tasks"
        title="Create a monitoring task"
        description="Loading…"
      />
      <Skeleton className="h-64 w-full" />
    </AppShell>
  );
}

function NewTaskForm() {
  const wallet = useWallet();
  const router = useRouter();
  const sp = useSearchParams();
  const presetAgent = sp?.get("agent") ?? "";

  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const agents = agentsData?.ok ? agentsData.data : [];

  const create = useCreateTask(wallet.address);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      agentId: presetAgent,
      taskType: "track-wallet",
      targetType: "wallet",
      targetAddress: "",
      targetSymbol: "",
      network: wallet.chainId || 5003,
      alertChannels: ["in-app"],
      frequency: "daily",
      riskThreshold: "",
      instructions: "",
    },
  });

  React.useEffect(() => {
    if (presetAgent) setValue("agentId", presetAgent);
  }, [presetAgent, setValue]);
  React.useEffect(() => {
    if (wallet.chainId) setValue("network", wallet.chainId);
  }, [wallet.chainId, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    const res = await create.mutateAsync(data);
    if (res.ok) {
      router.push("/my-agents");
    }
  });

  const channels = watch("alertChannels");
  const targetType = watch("targetType");
  const showAddress = targetType === "wallet" || targetType === "token" || targetType === "asset";

  if (!wallet.isConnected) {
    return (
      <AppShell title="Create task">
        <PageHeader
          eyebrow="Tasks"
          title="Create a monitoring task"
          description="Tell an agent what to watch and how to alert you."
        />
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="Connect your wallet to create a task"
          description="Tasks are scoped to your wallet address so alerts can be delivered to you only."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Create task">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/marketplace">
            <ChevronLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow="Tasks"
        title="Create a monitoring task"
        description="Pick an agent, define the target, and set how you want to be alerted."
      />

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent</CardTitle>
              <CardDescription>Choose which agent will run this task.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {agentsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : agentsData && !agentsData.ok ? (
                <ErrorState error={agentsData.error} setupHref="/settings" />
              ) : agents.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No agents are registered yet.{" "}
                  <Link href="/settings" className="text-accent-sand hover:underline">
                    Open settings
                  </Link>{" "}
                  for setup steps.
                </p>
              ) : (
                <Controller
                  control={control}
                  name="agentId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.agentId ? (
                <FieldError message={errors.agentId.message} />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task</CardTitle>
              <CardDescription>What should the agent monitor?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="taskType">Task type</Label>
                <Controller
                  control={control}
                  name="taskType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="taskType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_TYPE_LABEL).map(([id, label]) => (
                          <SelectItem key={id} value={id}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="targetType">Target type</Label>
                <Controller
                  control={control}
                  name="targetType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="targetType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_TYPES.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {showAddress ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="targetAddress">Target address</Label>
                  <Input
                    id="targetAddress"
                    placeholder="0x…"
                    {...register("targetAddress")}
                    className="font-mono"
                  />
                  {errors.targetAddress ? (
                    <FieldError message={errors.targetAddress.message} />
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="targetSymbol">Symbol (optional)</Label>
                <Input
                  id="targetSymbol"
                  placeholder="e.g. mETH"
                  {...register("targetSymbol")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="network">Network</Label>
                <Controller
                  control={control}
                  name="network"
                  render={({ field }) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="network">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NETWORK_OPTIONS.map((n) => (
                          <SelectItem key={n.id} value={String(n.id)}>
                            {n.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>How sensitive should the agent be?</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="riskThreshold">Risk threshold</Label>
                <Input
                  id="riskThreshold"
                  placeholder="e.g. 0.05 for 5% movement"
                  inputMode="decimal"
                  {...register("riskThreshold")}
                />
                {errors.riskThreshold ? (
                  <FieldError message={errors.riskThreshold.message} />
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="instructions">Notes / instructions (optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any context that should guide the agent. E.g. acceptable redemption windows, related wallets, off-chain context."
                  {...register("instructions")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert channels</CardTitle>
              <CardDescription>
                Where should we send signals? You can wire Telegram/Discord/email in settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ALERT_CHANNELS.map((c) => {
                  const active = channels.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? channels.filter((x) => x !== c.id)
                          : [...channels, c.id];
                        setValue("alertChannels", next as CreateTaskInput["alertChannels"], {
                          shouldValidate: true,
                        });
                      }}
                      className={`px-3 h-9 rounded-full text-xs border transition-colors ${
                        active
                          ? "bg-accent-sand/15 text-accent-sand border-accent-sand/40"
                          : "bg-bg-elevated text-text-muted border-border hover:text-text-primary"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {errors.alertChannels ? (
                <FieldError message={errors.alertChannels.message} className="mt-2" />
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SummaryRow label="Wallet" value={wallet.address ?? "—"} mono />
              <SummaryRow label="Network" value={watch("network") === 5000 ? "Mantle" : "Mantle Sepolia"} />
              <SummaryRow
                label="Channels"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {channels.length === 0 ? (
                      <span className="text-text-muted">None</span>
                    ) : (
                      channels.map((c) => (
                        <Badge key={c} variant="muted">
                          {c}
                        </Badge>
                      ))
                    )}
                  </div>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trust & safety</CardTitle>
              <CardDescription>
                Agents recommend; you approve. LeapVault does not execute trades on your behalf in MVP.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-text-muted leading-relaxed">
              Every alert includes a source, confidence score, and data limitations. This is not financial advice.
            </CardContent>
          </Card>

          {create.data && create.data.ok ? (
            <div className="surface-card p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-signal-ok mt-0.5" />
              <div>
                <div className="text-sm font-medium text-text-primary">
                  Task created
                </div>
                <div className="text-xs text-text-muted">
                  Track it on the My Agents page.
                </div>
              </div>
            </div>
          ) : null}

          {create.data && !create.data.ok ? (
            <ErrorState error={create.data.error} setupHref="/settings" />
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting || create.isPending}
            className="w-full"
            size="lg"
          >
            <PlusSquare className="h-4 w-4" />
            {isSubmitting || create.isPending ? "Creating…" : "Create task"}
          </Button>
        </aside>
      </form>
    </AppShell>
  );
}

function FieldError({ message, className = "" }: { message?: string; className?: string }) {
  if (!message) return null;
  return <p className={`text-xs text-signal-risk ${className}`}>{message}</p>;
}

function SummaryRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-text-muted text-xs uppercase tracking-wider">{label}</span>
      <span className={`text-text-primary text-right ${mono ? "font-mono text-xs tnum" : ""}`}>{value}</span>
    </div>
  );
}

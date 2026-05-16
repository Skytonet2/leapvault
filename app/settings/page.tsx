"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Bot,
  Cloud,
  Database,
  Globe,
  Network,
  Shield,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/utils/format";
import { TelegramConnect } from "@/components/settings/TelegramConnect";
import { ExecutionProviderStatus } from "@/components/execution/ExecutionProviderStatus";
import { AccountCard } from "@/components/settings/AccountCard";

interface AIProviderStatus {
  name: "nvidia" | "ollama" | "local-ollama" | "openai";
  model: string;
  configured: boolean;
  isPrimary: boolean;
  isFallback: boolean;
}

const PROVIDER_LABEL: Record<AIProviderStatus["name"], string> = {
  nvidia: "NVIDIA Build / NIM",
  ollama: "Ollama Cloud",
  "local-ollama": "Local Ollama",
  openai: "OpenAI",
};

async function fetchAIStatus() {
  const res = await fetch("/api/ai/status", { cache: "no-store" });
  return (await res.json()) as {
    ok: true;
    data: {
      providers: AIProviderStatus[];
      recentUsage: Array<{ feature: string; provider: string; model: string; createdAt: string }>;
      cacheEnabled: boolean;
      dailyLimit: number;
    };
  };
}

export default function SettingsPage() {
  const wallet = useWallet();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-status"],
    queryFn: fetchAIStatus,
    refetchInterval: 30_000,
  });

  return (
    <AppShell title="Settings">
      <PageHeader
        eyebrow="Settings"
        title="Account, network, and providers"
        description="Configure your wallet, notification channels, AI providers, and risk sensitivity."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AccountCard connectedWallet={wallet.address as `0x${string}` | null} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-accent-sand" /> Wallet
              </CardTitle>
              <CardDescription>Identity for tasks, alerts, and on-chain proofs.</CardDescription>
            </CardHeader>
            <CardContent>
              {wallet.isConnected ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm tnum">{shortAddress(wallet.address)}</span>
                  <Badge variant="ok">Connected</Badge>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Connect via the top-right wallet button to use task creation, alerts, and on-chain proofs.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent-sand" /> AI Providers
              </CardTitle>
              <CardDescription>
                Routing across NVIDIA, Ollama, and OpenAI-compatible providers. Keys are never exposed to the browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : data ? (
                <>
                  <div className="space-y-2">
                    {data.data.providers.map((p) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/50 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <Cloud className="h-4 w-4 text-text-dim" />
                          <div>
                            <div className="text-sm text-text-primary">
                              {PROVIDER_LABEL[p.name]}
                            </div>
                            <div className="text-xs text-text-muted">
                              Model: <span className="tnum">{p.model || "—"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {p.isPrimary ? <Badge variant="sand">Primary</Badge> : null}
                          {p.isFallback ? <Badge variant="sage">Fallback</Badge> : null}
                          {p.configured ? (
                            <Badge variant="ok">
                              <Wifi className="h-3 w-3" /> Connected
                            </Badge>
                          ) : (
                            <Badge variant="muted">
                              <WifiOff className="h-3 w-3" /> Missing key
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-text-muted space-y-1">
                    <div>
                      Cache: {data.data.cacheEnabled ? "enabled" : "disabled"} · Daily limit:{" "}
                      {data.data.dailyLimit} requests / user
                    </div>
                    {data.data.recentUsage.length > 0 ? (
                      <div>
                        Last call: {data.data.recentUsage[0].provider} ({data.data.recentUsage[0].feature})
                      </div>
                    ) : (
                      <div>No AI calls have been made yet.</div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-text-muted">Unable to read provider status.</p>
              )}
            </CardContent>
          </Card>

          <ExecutionProviderStatus />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-accent-sand" /> Notifications
              </CardTitle>
              <CardDescription>
                Connect external channels to receive alerts where you already work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <TelegramConnect wallet={wallet.address as `0x${string}` | null} />
              <ChannelRow
                label="Discord"
                hint="Add your Discord webhook URL in environment to enable."
                connected={false}
              />
              <ChannelRow label="Email" hint="Email channel requires a provider integration." connected={false} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-4 w-4 text-accent-sand" /> Network
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Default</span>
                <span className="text-text-primary">
                  {process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mantle" ? "Mantle" : "Mantle Sepolia"}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Network selection lives in the wallet connector. Defaults can be set via{" "}
                <code className="text-accent-sand">NEXT_PUBLIC_DEFAULT_NETWORK</code>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-accent-sand" /> Data sources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <SourceRow name="Database (Supabase / Postgres)" envVar="DATABASE_URL" />
              <SourceRow name="AgentRegistry contract" envVar="AGENT_REGISTRY_CONTRACT" />
              <SourceRow name="TaskRegistry contract" envVar="TASK_REGISTRY_CONTRACT" />
              <SourceRow name="ReputationRegistry contract" envVar="REPUTATION_CONTRACT" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-accent-sand" /> Risk sensitivity
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              Risk thresholds are configured per task. Global sensitivity preferences will appear here once the
              account preferences table is wired.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-accent-sand" /> About
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-text-muted leading-relaxed">
              LeapVault Agent is a Mantle-native AI agent marketplace for on-chain alpha and RWA intelligence. Agents
              recommend; you approve. Nothing on this site is financial advice.
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function ChannelRow({
  label,
  hint,
  connected,
}: {
  label: string;
  hint: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2.5">
      <div>
        <div className="text-sm text-text-primary">{label}</div>
        <div className="text-xs text-text-muted leading-relaxed">{hint}</div>
      </div>
      {connected ? (
        <Badge variant="ok">Connected</Badge>
      ) : (
        <Badge variant="muted">Setup required</Badge>
      )}
    </div>
  );
}

function SourceRow({ name, envVar }: { name: string; envVar: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <div>
        <div className="text-text-primary">{name}</div>
        <div className="text-text-muted">
          env: <code className="text-accent-sand">{envVar}</code>
        </div>
      </div>
      <Badge variant="muted">Server-side</Badge>
    </div>
  );
}

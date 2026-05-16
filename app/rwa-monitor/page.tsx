"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Database, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { RwaAssetTable } from "@/components/rwa/RwaAssetTable";
import { useRwaAssets } from "@/hooks/useRwaAssets";
import { RWA_CATEGORY_LABEL, type RwaCategory } from "@/types/rwa";
import { cn } from "@/lib/utils/cn";

interface SyncResult {
  ok: true;
  data: {
    fetched: number;
    selected: number;
    upserted: number;
    failed: number;
    source: string;
    syncedAt: string;
  };
}

const CATEGORY_FILTERS: Array<{ id: RwaCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "treasuries", label: "Treasuries" },
  { id: "stable-yield", label: "Stable yield" },
  { id: "real-estate", label: "Real estate" },
  { id: "credit", label: "Credit" },
  { id: "commodities", label: "Commodities" },
  { id: "liquid-staking", label: "Liquid staking" },
];

export default function RwaMonitorPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<(typeof CATEGORY_FILTERS)[number]["id"]>("all");
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);
  const [lastSync, setLastSync] = React.useState<SyncResult["data"] | null>(null);
  const { data, isLoading } = useRwaAssets();

  const assets = data?.ok ? data.data : [];
  const filtered = filter === "all" ? assets : assets.filter((a) => a.category === filter);

  async function refresh() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/rwa-assets/sync", { method: "POST" });
      const json = (await res.json()) as SyncResult | { ok: false; error: { message: string } };
      if (!json.ok) {
        setSyncError(json.error.message);
      } else {
        setLastSync(json.data);
        await queryClient.invalidateQueries({ queryKey: ["rwa-assets"] });
      }
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppShell title="RWA Monitor">
      <PageHeader
        eyebrow="RWA Monitor"
        title="Real-world assets, monitored on-chain"
        description="Track tokenized treasuries, yield-bearing stables, real estate, credit, and commodities, with risk breakdowns and agent activity."
        actions={
          <>
            <Button variant="outline" disabled>
              <Database className="h-4 w-4" /> Source: DefiLlama
            </Button>
            <Button onClick={refresh} disabled={syncing}>
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Syncing…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" /> Refresh from DefiLlama
                </>
              )}
            </Button>
          </>
        }
      />

      {syncError ? (
        <div className="mb-4 text-sm text-signal-risk bg-signal-risk/10 border border-signal-risk/30 rounded-md px-3 py-2">
          Sync failed: {syncError}
        </div>
      ) : null}
      {lastSync ? (
        <div className="mb-4 text-xs text-text-muted">
          Last sync at {new Date(lastSync.syncedAt).toLocaleTimeString()}: fetched{" "}
          <span className="tnum text-text-primary">{lastSync.fetched}</span> pools, upserted{" "}
          <span className="tnum text-accent-sage">{lastSync.upserted}</span> RWA assets
          {lastSync.failed > 0 ? (
            <>
              , <span className="text-signal-risk">{lastSync.failed} failed</span>
            </>
          ) : null}
          .
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {CATEGORY_FILTERS.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={filter === c.id ? "secondary" : "ghost"}
            onClick={() => setFilter(c.id)}
            className={cn("rounded-full text-xs", filter === c.id && "border-accent-sand/40")}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : data && !data.ok ? (
        <ErrorState error={data.error} setupHref="/settings" />
      ) : assets.length === 0 ? (
        <EmptyState
          variant="setup"
          icon={<Building2 className="h-5 w-5" />}
          title="No RWA assets yet"
          description="Pull live yield data from DefiLlama to populate this monitor. We never show synthetic assets, only real pools with a real source."
          action={{ label: syncing ? "Syncing…" : "Sync from DefiLlama", onClick: refresh }}
          secondary={{ label: "Browse agents", href: "/marketplace" }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No assets in this category yet"
          description="Switch category or register a new asset adapter."
          action={{ label: "Reset filters", onClick: () => setFilter("all") }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <Badge variant="muted">{filtered.length} assets</Badge>
            <Badge variant="sage">Source: adapters configured</Badge>
            <span>
              Showing only assets reported by connected data adapters. Disconnected adapters are hidden.
            </span>
          </div>

          <RwaAssetTable assets={filtered} />

          <RwaCategoryGrid filter={filter} setFilter={setFilter} />
        </div>
      )}
    </AppShell>
  );
}

function RwaCategoryGrid({
  filter,
  setFilter,
}: {
  filter: RwaCategory | "all";
  setFilter: (v: RwaCategory | "all") => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-4">
      {(Object.keys(RWA_CATEGORY_LABEL) as RwaCategory[]).map((cat) => (
        <button
          key={cat}
          onClick={() => setFilter(cat)}
          className={cn(
            "rounded-md p-3 text-xs text-left border transition-colors",
            filter === cat
              ? "bg-bg-elevated text-text-primary border-accent-sand/40"
              : "bg-bg-elevated/40 text-text-muted border-border hover:text-text-primary",
          )}
        >
          {RWA_CATEGORY_LABEL[cat]}
        </button>
      ))}
    </div>
  );
}

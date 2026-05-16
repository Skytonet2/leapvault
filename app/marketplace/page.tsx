"use client";

import * as React from "react";
import { Compass, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgentCard } from "@/components/agents/AgentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-states/EmptyState";
import { ErrorState } from "@/components/empty-states/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents } from "@/hooks/useAgents";
import { cn } from "@/lib/utils/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentCategory } from "@/types/agent";

const CATEGORIES: Array<{ id: AgentCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "smart-wallet", label: "Smart Wallets" },
  { id: "whale", label: "Whales" },
  { id: "rwa-yield", label: "RWA yield" },
  { id: "token-risk", label: "Token risk" },
  { id: "liquidity", label: "Liquidity" },
  { id: "portfolio-risk", label: "Portfolio risk" },
  { id: "reputation", label: "Reputation" },
];

export default function MarketplacePage() {
  const [category, setCategory] = React.useState<(typeof CATEGORIES)[number]["id"]>("all");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<string>("reputation");

  const params = React.useMemo(
    () => ({
      category: category === "all" ? undefined : category,
      search: search || undefined,
      sort,
    }),
    [category, search, sort],
  );

  const { data, isLoading } = useAgents(params);
  const agents = data?.ok ? data.data : [];

  return (
    <AppShell title="Agent Marketplace">
      <PageHeader
        eyebrow="Marketplace"
        title="Hire a specialized AI agent"
        description="Browse agents for wallet tracking, whale alerts, RWA yield risk, liquidity flow, token risk, portfolio risk, and reputation."
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name or skill…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="reputation">Highest reputation</SelectItem>
            <SelectItem value="most-used">Most used</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price">Lowest price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={category === c.id ? "secondary" : "ghost"}
            onClick={() => setCategory(c.id)}
            className={cn(
              "rounded-full text-xs",
              category === c.id && "border-accent-sand/40",
            )}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : data && !data.ok ? (
        <ErrorState error={data.error} setupHref="/settings" />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="No agents match your filters"
          description="Try a different category, clear the search, or check back once more agents register on the AgentRegistry."
          action={{ label: "Clear filters", onClick: () => { setCategory("all"); setSearch(""); } }}
          secondary={{ label: "View setup", href: "/settings" }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

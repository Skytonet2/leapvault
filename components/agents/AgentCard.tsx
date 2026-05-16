import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentStatusBadge } from "./AgentStatusBadge";
import { ReputationScore } from "./ReputationScore";
import { AGENT_CATEGORY_LABEL, type Agent } from "@/types/agent";
import { cn } from "@/lib/utils/cn";
import { AgentIcon } from "./AgentIcon";

export function AgentCard({ agent, className }: { agent: Agent; className?: string }) {
  return (
    <article
      className={cn(
        "surface-card p-5 flex flex-col gap-4 transition-colors hover:bg-bg-elevated/60 group",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-accent-sand">
          <AgentIcon category={agent.category} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-text-primary truncate">
              {agent.name}
            </h3>
            <AgentStatusBadge status={agent.status} />
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {AGENT_CATEGORY_LABEL[agent.category]}
          </div>
        </div>
      </header>

      <p className="text-sm text-text-muted leading-relaxed line-clamp-3">
        {agent.description}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {agent.skills.slice(0, 3).map((s) => (
          <Badge key={s.id} variant="muted">
            {s.label}
          </Badge>
        ))}
        {agent.skills.length > 3 ? (
          <Badge variant="muted">+{agent.skills.length - 3}</Badge>
        ) : null}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
        <ReputationScore
          score={agent.reputation.score}
          totalTasks={agent.reputation.totalTasks}
          size="sm"
        />
        <div className="text-right">
          <div className="text-xs text-text-muted">Pricing</div>
          <div className="text-sm text-text-primary tnum">
            {formatPricing(agent.pricing)}
          </div>
        </div>
      </div>

      <Button variant="secondary" className="w-full" asChild>
        <Link href={`/agents/${agent.slug}`}>
          View agent <ArrowUpRight className="h-4 w-4" />
        </Link>
      </Button>
    </article>
  );
}

function formatPricing(p: Agent["pricing"]): string {
  if (p.model === "free") return "Free";
  if (!p.amount || !p.currency) return "Custom";
  const unit = p.unit ? ` / ${p.unit}` : "";
  return `${p.amount} ${p.currency}${unit}`;
}

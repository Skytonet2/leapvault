import {
  ArrowRight,
  Bell,
  CheckSquare,
  ClipboardList,
  Eye,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  {
    icon: Eye,
    title: "Monitor",
    subtitle: "Live Mantle RPC",
    detail: "Agents watch wallets, RWA pools, and risk surfaces on every block.",
  },
  {
    icon: Bell,
    title: "Explain",
    subtitle: "NVIDIA GLM-5.1",
    detail: "Every alert ships with confidence, source, and what to verify.",
  },
  {
    icon: ClipboardList,
    title: "Propose",
    subtitle: "Action draft",
    detail: "Agent converts the alert into a structured proposal with parameters.",
  },
  {
    icon: CheckSquare,
    title: "Approve",
    subtitle: "User-gated",
    detail: "Nothing executes without your explicit approval. High-risk needs a checkbox.",
  },
  {
    icon: Workflow,
    title: "Execute",
    subtitle: "RealClaw / Byreal",
    detail: "Approved actions route through configured providers. Dry-run by default.",
  },
  {
    icon: ShieldCheck,
    title: "Reputation",
    subtitle: "Real outcomes",
    detail: "Counters move on every event. Score compounds with proven usefulness.",
  },
] as const;

/**
 * Horizontal flow pipeline used in the hero side and the "How it works" section.
 *
 * Variant "art" renders compact icons + labels for the hero (no detail text).
 * Variant "detail" renders a 6-card grid with full descriptions.
 */
export function FlowPipeline({ variant }: { variant: "art" | "detail" }) {
  if (variant === "detail") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className="surface-card p-4 flex flex-col gap-2 relative"
          >
            <div className="flex items-center justify-between">
              <div className="h-8 w-8 rounded-md bg-bg-elevated border border-border grid place-items-center text-accent-sand">
                <s.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-text-dim">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">{s.title}</div>
              <div className="text-[10px] uppercase tracking-wider text-accent-sand/70 mt-0.5">
                {s.subtitle}
              </div>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">{s.detail}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="surface-elevated p-5 shadow-elevate">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-text-muted font-mono tracking-wide">
          <span className="h-2 w-2 rounded-full bg-signal-ok" /> LIVE · AGENT FLOW
        </div>
        <Badge variant="muted">Mantle-native</Badge>
      </div>
      <ol className="space-y-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-bg-elevated border border-border grid place-items-center text-accent-sand shrink-0">
              <s.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-text-primary">{s.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-accent-sand/70 truncate">
                  {s.subtitle}
                </span>
              </div>
            </div>
            {i < STEPS.length - 1 ? (
              <ArrowRight className="h-3.5 w-3.5 text-text-dim shrink-0" />
            ) : null}
          </li>
        ))}
      </ol>
      <div className="hairline my-4" />
      <div className="text-[11px] text-text-muted leading-relaxed">
        Monitoring is autonomous. Execution is approval-gated. Reputation reflects real
        outcomes, not promises.
      </div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import type { AgentStatus } from "@/types/agent";

const MAP: Record<AgentStatus, { label: string; variant: "ok" | "warn" | "muted" | "sage" }> = {
  available: { label: "Available", variant: "ok" },
  paused: { label: "Paused", variant: "warn" },
  private: { label: "Private", variant: "muted" },
  "coming-soon": { label: "Coming soon", variant: "sage" },
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const meta = MAP[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

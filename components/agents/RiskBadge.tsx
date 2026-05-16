import { Badge } from "@/components/ui/badge";

export type RiskLevel = "low" | "medium" | "high" | "critical" | "unknown";

const MAP: Record<RiskLevel, { label: string; variant: "ok" | "warn" | "risk" | "muted" }> = {
  low: { label: "Low risk", variant: "ok" },
  medium: { label: "Medium risk", variant: "warn" },
  high: { label: "High risk", variant: "risk" },
  critical: { label: "Critical", variant: "risk" },
  unknown: { label: "Data unavailable", variant: "muted" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const meta = MAP[level];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function riskLevelFromScore(score: number | null): RiskLevel {
  if (score === null) return "unknown";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

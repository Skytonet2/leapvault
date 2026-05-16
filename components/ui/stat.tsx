import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: string } | null;
  className?: string;
}

export function StatCard({ label, value, hint, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("surface-card p-5 flex flex-col gap-2", className)}>
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-text-muted">{label}</div>
        {icon ? <div className="text-text-dim">{icon}</div> : null}
      </div>
      <div className="text-2xl font-semibold text-text-primary tnum">{value}</div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-muted">{hint}</div>
        {trend ? (
          <span
            className={cn(
              "text-xs tnum",
              trend.direction === "up" && "text-signal-ok",
              trend.direction === "down" && "text-signal-risk",
              trend.direction === "flat" && "text-text-muted",
            )}
          >
            {trend.label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

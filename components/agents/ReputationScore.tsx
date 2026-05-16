import { cn } from "@/lib/utils/cn";
import { ShieldCheck } from "lucide-react";

export interface ReputationScoreProps {
  score: number | null;
  /** Total tasks; used to surface "insufficient activity" copy. */
  totalTasks?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ReputationScore({
  score,
  totalTasks = 0,
  size = "md",
  className,
}: ReputationScoreProps) {
  const dimensions = size === "sm" ? 36 : size === "md" ? 56 : 80;
  const stroke = size === "sm" ? 3 : 4;
  const r = (dimensions - stroke) / 2;
  const C = 2 * Math.PI * r;
  const filled = score !== null ? (Math.max(0, Math.min(100, score)) / 100) * C : 0;
  const color =
    score === null
      ? "stroke-text-dim"
      : score >= 70
        ? "stroke-signal-ok"
        : score >= 40
          ? "stroke-signal-warn"
          : "stroke-signal-risk";

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="relative" style={{ width: dimensions, height: dimensions }}>
        <svg viewBox={`0 0 ${dimensions} ${dimensions}`} className="-rotate-90">
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={r}
            className="stroke-border"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={dimensions / 2}
            cy={dimensions / 2}
            r={r}
            strokeWidth={stroke}
            className={cn(color, "transition-[stroke-dashoffset] duration-500")}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - filled}
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {score === null ? (
            <ShieldCheck className="h-4 w-4 text-text-dim" />
          ) : (
            <span
              className={cn(
                "tnum text-text-primary",
                size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base",
                "font-semibold",
              )}
            >
              {score}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider text-text-muted">
          Reputation
        </span>
        <span className="text-sm text-text-primary">
          {score === null
            ? totalTasks < 3
              ? "Not enough activity"
              : "Pending"
            : `${score}/100`}
        </span>
      </div>
    </div>
  );
}

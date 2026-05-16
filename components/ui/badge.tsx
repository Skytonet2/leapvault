import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-bg-soft text-text-primary border border-border",
        muted: "bg-bg-elevated text-text-muted border border-border",
        sand: "bg-accent-sand/15 text-accent-sand border border-accent-sand/30",
        sage: "bg-accent-sage/15 text-accent-sage border border-accent-sage/30",
        risk: "bg-signal-risk/15 text-signal-risk border border-signal-risk/30",
        warn: "bg-signal-warn/15 text-signal-warn border border-signal-warn/30",
        ok: "bg-signal-ok/15 text-signal-ok border border-signal-ok/30",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

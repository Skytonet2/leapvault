import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondary?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  /** Use for "not configured" / setup messages. */
  variant?: "default" | "setup" | "error";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  variant = "default",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-card p-8 sm:p-10 text-center flex flex-col items-center gap-4",
        variant === "setup" && "border-dashed",
        variant === "error" && "border-signal-risk/30",
        className,
      )}
    >
      {icon ? (
        <div
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            variant === "error"
              ? "bg-signal-risk/10 text-signal-risk"
              : "bg-bg-elevated text-accent-sand",
          )}
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-medium text-text-primary">{title}</h3>
        {description ? (
          <p className="text-sm text-text-muted leading-relaxed">{description}</p>
        ) : null}
      </div>
      {(action || secondary) && (
        <div className="flex flex-wrap gap-2 justify-center pt-1">
          {action ? (
            action.href ? (
              <Button asChild>
                <a href={action.href}>{action.label}</a>
              </Button>
            ) : (
              <Button onClick={action.onClick}>{action.label}</Button>
            )
          ) : null}
          {secondary ? (
            secondary.href ? (
              <Button variant="outline" asChild>
                <a href={secondary.href}>{secondary.label}</a>
              </Button>
            ) : (
              <Button variant="outline" onClick={secondary.onClick}>
                {secondary.label}
              </Button>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import * as React from "react";
import { ArrowUpRight, Clock, Loader2, PlusCircle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALERT_SEVERITY_LABEL, type Alert } from "@/types/alert";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ExecutionApprovalModal } from "@/components/execution/ExecutionApprovalModal";
import type {
  ExecutionProposal,
  ExecutionResult,
} from "@/lib/execution/types";

const SEVERITY_VARIANT: Record<Alert["severity"], "muted" | "ok" | "warn" | "risk"> = {
  info: "muted",
  low: "ok",
  medium: "warn",
  high: "risk",
  critical: "risk",
};

/** Alerts that can produce an executable proposal. */
function alertCanCreateProposal(alert: Alert): boolean {
  return Boolean(alert.agentId);
}

export function AlertCard({
  alert,
  wallet,
  className,
}: {
  alert: Alert;
  wallet?: `0x${string}` | null;
  className?: string;
}) {
  const unread = !alert.readAt;
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposal, setProposal] = React.useState<ExecutionProposal | null>(null);
  const [open, setOpen] = React.useState(false);

  const canPropose = alertCanCreateProposal(alert) && Boolean(wallet);

  async function createProposal() {
    if (!wallet) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/execution/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, alertId: alert.id }),
      });
      const json = (await res.json()) as
        | { ok: true; data: ExecutionProposal }
        | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
      } else {
        setProposal(json.data);
        setOpen(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function handleDone(_payload: { proposal: ExecutionProposal; result?: ExecutionResult }) {
    setOpen(false);
  }

  return (
    <article
      className={cn(
        "surface-card p-4 flex gap-3",
        unread && "border-accent-sand/30",
        className,
      )}
    >
      <div className="mt-0.5">
        <div
          className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center border",
            alert.severity === "critical" || alert.severity === "high"
              ? "bg-signal-risk/10 text-signal-risk border-signal-risk/30"
              : alert.severity === "medium"
                ? "bg-signal-warn/10 text-signal-warn border-signal-warn/30"
                : "bg-bg-elevated text-text-muted border-border",
          )}
        >
          <ShieldAlert className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <h4 className="text-sm font-medium text-text-primary flex-1">{alert.title}</h4>
          <Badge variant={SEVERITY_VARIANT[alert.severity]}>
            {ALERT_SEVERITY_LABEL[alert.severity]}
          </Badge>
        </div>
        <p className="text-sm text-text-muted mt-1 leading-relaxed line-clamp-3">
          {alert.explanation}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-dim">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {formatRelativeTime(alert.createdAt)}
          </span>
          {alert.confidence !== null ? (
            <span>Confidence {Math.round(alert.confidence * 100)}%</span>
          ) : (
            <span>Deterministic signal</span>
          )}
          {alert.sourceUrl ? (
            <Link
              href={alert.sourceUrl}
              target="_blank"
              className="inline-flex items-center gap-1 text-accent-sand hover:underline"
            >
              Source <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
        {canPropose ? (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <Button size="sm" variant="outline" onClick={createProposal} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <PlusCircle className="h-3 w-3" /> Create action proposal
                </>
              )}
            </Button>
            <span className="text-[11px] text-text-muted">
              User approval required before any execution.
            </span>
            {error ? <span className="text-[11px] text-signal-risk">{error}</span> : null}
          </div>
        ) : null}
      </div>

      <ExecutionApprovalModal
        proposal={proposal}
        wallet={wallet ?? null}
        open={open}
        onClose={() => setOpen(false)}
        onDone={handleDone}
      />
    </article>
  );
}

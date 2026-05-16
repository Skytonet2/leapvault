"use client";

import * as React from "react";
import { AlertTriangle, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionPreview } from "./ActionPreview";
import type { ExecutionProposal, ExecutionResult } from "@/lib/execution/types";

type Decision = "approve" | "reject";

export function ExecutionApprovalModal({
  proposal,
  wallet,
  open,
  onClose,
  onDone,
}: {
  proposal: ExecutionProposal | null;
  wallet: `0x${string}` | null;
  open: boolean;
  onClose: () => void;
  onDone?: (result: { proposal: ExecutionProposal; result?: ExecutionResult }) => void;
}) {
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<Decision | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<ExecutionResult | null>(null);
  const [rejected, setRejected] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setAcknowledged(false);
      setSubmitting(null);
      setError(null);
      setSuccess(null);
      setRejected(false);
    }
  }, [open]);

  if (!open || !proposal) return null;

  const isHighRisk = proposal.riskLevel === "high";
  const canApprove = isHighRisk ? acknowledged : true;

  async function submit(decision: Decision) {
    if (!wallet || !proposal) return;
    setSubmitting(decision);
    setError(null);
    try {
      const res = await fetch("/api/execution/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet,
          proposalId: proposal.id,
          decision,
          highRiskAcknowledged: acknowledged,
        }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            data: ExecutionProposal | { proposal: ExecutionProposal; result: ExecutionResult };
          }
        | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
      } else if (decision === "approve" && "result" in (json.data as object)) {
        const payload = json.data as { proposal: ExecutionProposal; result: ExecutionResult };
        setSuccess(payload.result);
        onDone?.(payload);
      } else {
        // Reject path: confirm visually before auto-closing so the user can
        // see the action took effect instead of guessing.
        setRejected(true);
        onDone?.({ proposal: json.data as ExecutionProposal });
        setTimeout(() => onClose(), 1200);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="surface-elevated max-w-xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">
              Review before execution
            </div>
            <h3 className="text-lg font-semibold text-text-primary mt-0.5">
              {proposal.title}
            </h3>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">{proposal.summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-text-primary -mr-1 -mt-1 p-1 rounded ring-focus"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ActionPreview proposal={proposal} />

        {isHighRisk ? (
          <label className="mt-5 flex gap-2.5 items-start surface-card p-3 border-signal-risk/40 bg-signal-risk/5">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs text-text-primary leading-relaxed">
              <span className="inline-flex items-center gap-1 text-signal-risk font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> High-risk action
              </span>{" "}
              . I understand this proposal carries elevated risk and I am approving it knowingly.
            </span>
          </label>
        ) : null}

        {error ? (
          <div className="mt-4 text-sm text-signal-risk bg-signal-risk/10 border border-signal-risk/30 rounded-md px-3 py-2">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 surface-card p-3 border-accent-sage/30">
            <div className="flex items-center gap-2 text-sm text-accent-sage">
              <ShieldCheck className="h-4 w-4" />
              {success.dryRun
                ? "Dry run complete. No transaction was sent."
                : success.transactionHash
                  ? "Provider confirmed execution."
                  : success.status === "submitted"
                    ? "Submitted to provider. Awaiting confirmation."
                    : "Recorded."}
            </div>
            {success.transactionHash ? (
              <div className="text-xs text-text-muted mt-2 tnum break-all">
                tx: {success.transactionHash}
              </div>
            ) : null}
            {success.dryRun ? (
              <div className="mt-2">
                <Badge variant="muted">Dry run: no transaction was sent.</Badge>
              </div>
            ) : null}
          </div>
        ) : null}

        {rejected ? (
          <div className="mt-4 surface-card p-3 border-signal-warn/30 bg-signal-warn/5">
            <div className="flex items-center gap-2 text-sm text-signal-warn">
              <X className="h-4 w-4" />
              Proposal rejected. No execution will happen.
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <Button
            variant="ghost"
            disabled={Boolean(submitting) || rejected || Boolean(success)}
            onClick={() => submit("reject")}
          >
            {submitting === "reject" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Rejecting…
              </>
            ) : (
              <>
                <X className="h-4 w-4" /> Reject
              </>
            )}
          </Button>
          <Button
            disabled={Boolean(submitting) || !canApprove || Boolean(success) || rejected}
            onClick={() => submit("approve")}
          >
            {submitting === "approve" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Approve
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

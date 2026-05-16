"use client";

import * as React from "react";
import { ChevronRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExecutionStatusBadge } from "./ExecutionStatusBadge";
import { ExecutionApprovalModal } from "./ExecutionApprovalModal";
import {
  ACTION_TYPE_LABEL,
  PROVIDER_LABEL,
  RISK_LEVEL_LABEL,
  type ExecutionProposal,
  type ExecutionResult,
} from "@/lib/execution/types";
import { formatRelativeTime } from "@/lib/utils/format";

const RISK_VARIANT: Record<ExecutionProposal["riskLevel"], "muted" | "ok" | "warn" | "risk"> = {
  low: "ok",
  medium: "warn",
  high: "risk",
  unknown: "muted",
};

export function ExecutionProposalCard({
  proposal,
  wallet,
  onChanged,
}: {
  proposal: ExecutionProposal;
  wallet: `0x${string}` | null;
  onChanged?: (next: { proposal: ExecutionProposal; result?: ExecutionResult }) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const reviewable =
    proposal.status === "pending_approval" || proposal.status === "draft";
  return (
    <article className="surface-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium text-text-primary">{proposal.title}</h4>
            <ExecutionStatusBadge status={proposal.status} />
          </div>
          <p className="text-sm text-text-muted mt-1 leading-relaxed line-clamp-2">
            {proposal.summary}
          </p>
        </div>
        <Badge variant={RISK_VARIANT[proposal.riskLevel]}>
          {RISK_LEVEL_LABEL[proposal.riskLevel]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <Badge variant="sand">{ACTION_TYPE_LABEL[proposal.actionType]}</Badge>
        <Badge variant="sage">{PROVIDER_LABEL[proposal.provider]}</Badge>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {formatRelativeTime(proposal.createdAt)}
        </span>
        {proposal.confidence !== null ? (
          <span>Confidence {Math.round(proposal.confidence * 100)}%</span>
        ) : null}
      </div>

      {reviewable ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            Review & approve <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <ExecutionApprovalModal
        proposal={proposal}
        wallet={wallet}
        open={open}
        onClose={() => setOpen(false)}
        onDone={(next) => {
          setOpen(false);
          onChanged?.(next);
        }}
      />
    </article>
  );
}

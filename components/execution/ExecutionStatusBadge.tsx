import { Badge } from "@/components/ui/badge";
import type { ExecutionProposalStatus } from "@/lib/execution/types";

const STATUS_VARIANT: Record<
  ExecutionProposalStatus,
  "muted" | "sand" | "sage" | "warn" | "risk" | "ok"
> = {
  draft: "muted",
  pending_approval: "warn",
  approved: "sage",
  rejected: "muted",
  submitted: "sand",
  completed: "ok",
  failed: "risk",
};

const STATUS_LABEL: Record<ExecutionProposalStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  submitted: "Submitted",
  completed: "Completed",
  failed: "Failed",
};

export function ExecutionStatusBadge({ status }: { status: ExecutionProposalStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

import { Badge } from "@/components/ui/badge";
import {
  ACTION_TYPE_LABEL,
  PROVIDER_LABEL,
  RISK_LEVEL_LABEL,
  type ExecutionProposal,
} from "@/lib/execution/types";

/**
 * Pure-display block showing what the user is about to approve.
 * Used inside the approval modal and on the proposal detail card.
 */
export function ActionPreview({ proposal }: { proposal: ExecutionProposal }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Cell label="Action" value={ACTION_TYPE_LABEL[proposal.actionType]} />
        <Cell label="Provider" value={PROVIDER_LABEL[proposal.provider]} />
        <Cell label="Risk" value={RISK_LEVEL_LABEL[proposal.riskLevel]} />
        <Cell
          label="Confidence"
          value={
            proposal.confidence !== null
              ? `${Math.round(proposal.confidence * 100)}%`
              : "Deterministic signal"
          }
        />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Rationale</div>
        <p className="text-sm text-text-primary leading-relaxed">{proposal.rationale}</p>
      </div>
      {Object.keys(proposal.requestedParams).length > 0 ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
            Requested params
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(proposal.requestedParams).map(([k, v]) => (
              <Badge key={k} variant="muted">
                <span className="text-text-muted">{k}:</span>
                <span className="text-text-primary ml-1 tnum">{String(v)}</span>
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      <p className="text-xs text-text-muted leading-relaxed">
        AI-generated proposals can be wrong. Review the data source, risk level, and action details
        before approving. Not financial advice.
      </p>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-text-primary">{value}</div>
    </div>
  );
}

export type AlertSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AlertType =
  | "wallet-movement"
  | "whale-trade"
  | "rwa-yield-change"
  | "liquidity-drop"
  | "token-anomaly"
  | "portfolio-warning"
  | "risk-warning";

export type AlertSourceType = "onchain" | "oracle" | "indexer" | "agent" | "external";

export interface Alert {
  id: string;
  taskId: string | null;
  agentId: string | null;
  userWallet: `0x${string}`;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  explanation: string;
  /** 0–1 model confidence. `null` for deterministic signals. */
  confidence: number | null;
  sourceUrl?: string | null;
  sourceType: AlertSourceType;
  /** Free-form metadata: tx hash, amounts, asset refs, etc. */
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
}

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: "Info",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

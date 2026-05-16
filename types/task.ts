export type TaskType =
  | "track-wallet"
  | "monitor-whale"
  | "monitor-rwa-yield"
  | "monitor-liquidity"
  | "monitor-token-risk"
  | "monitor-portfolio-risk";

export type TaskTargetType = "wallet" | "token" | "asset" | "portfolio";

export type TaskStatus = "active" | "paused" | "completed" | "failed" | "pending";

export type AlertChannel = "in-app" | "telegram" | "discord" | "email";

export type TaskFrequency = "realtime" | "hourly" | "daily" | "weekly";

export interface Task {
  id: string;
  userWallet: `0x${string}`;
  agentId: string;
  taskType: TaskType;
  targetType: TaskTargetType;
  targetAddress?: `0x${string}` | null;
  targetSymbol?: string | null;
  network: number;
  status: TaskStatus;
  alertChannels: AlertChannel[];
  /** Numeric threshold encoded as decimal string. */
  riskThreshold?: string | null;
  frequency: TaskFrequency;
  instructions?: string | null;
  onchainTaskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  "track-wallet": "Track wallet",
  "monitor-whale": "Monitor whale movement",
  "monitor-rwa-yield": "Monitor RWA yield",
  "monitor-liquidity": "Monitor asset liquidity",
  "monitor-token-risk": "Monitor token risk",
  "monitor-portfolio-risk": "Monitor portfolio risk",
};

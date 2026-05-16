export type AgentCategory =
  | "smart-wallet"
  | "whale"
  | "rwa-yield"
  | "token-risk"
  | "liquidity"
  | "portfolio-risk"
  | "reputation";

export type AgentStatus = "available" | "paused" | "private" | "coming-soon";

export type AgentPricingModel = "free" | "subscription" | "per-task" | "performance";

export interface AgentPricing {
  model: AgentPricingModel;
  /** Token symbol, e.g. "MNT", "USDC". Omitted for free tier. */
  currency?: string;
  /** Numeric amount as a decimal string to preserve precision. */
  amount?: string;
  /** Optional cadence label such as "month", "task", "alert". */
  unit?: string;
}

export interface AgentSkill {
  id: string;
  label: string;
  description?: string;
}

export interface AgentReputation {
  /** 0–100 composite score. `null` if the agent has insufficient activity. */
  score: number | null;
  totalTasks: number;
  completedTasks: number;
  userRatingAverage: number | null;
  falseAlertReports: number;
  usefulAlertCount: number;
  /** Action proposals the agent created via the execution layer. */
  proposalsCreated: number;
  proposalsApproved: number;
  proposalsRejected: number;
  /** Executions that returned a non-failed status from a provider (incl. dry-run). */
  executionsCompleted: number;
  executionsFailed: number;
  /** keccak256 of (agentId + score + period) recorded on-chain if available. */
  onchainProofHash?: string | null;
  updatedAt: string;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  category: AgentCategory;
  description: string;
  skills: AgentSkill[];
  supportedNetworks: number[];
  status: AgentStatus;
  /** On-chain identity. Optional — agent may be off-chain only in MVP. */
  walletAddress?: `0x${string}` | null;
  ownerAddress?: `0x${string}` | null;
  pricing: AgentPricing;
  reputation: AgentReputation;
  createdAt: string;
  updatedAt: string;
}

export const AGENT_CATEGORY_LABEL: Record<AgentCategory, string> = {
  "smart-wallet": "Smart Wallet Tracker",
  whale: "Whale Alert Agent",
  "rwa-yield": "RWA Yield Risk Agent",
  "token-risk": "Token Risk Agent",
  liquidity: "Liquidity Flow Agent",
  "portfolio-risk": "Portfolio Risk Agent",
  reputation: "Reputation Agent",
};

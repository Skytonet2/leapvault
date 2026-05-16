export interface RealClawClientConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  telegramBotUsername: string;
  sessionId: string;
}

export interface RealClawSubmitRequest {
  proposalId: string;
  userWallet: string;
  actionType: string;
  params: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Shape we expect from the RealClaw execution endpoint. Field names follow the
 * `transactionHash`/`status` conventions used by RealClaw-style agent runners.
 * The adapter never trusts unknown fields — only `status` and `transactionHash`
 * are surfaced to the user.
 */
export interface RealClawSubmitResponse {
  status?: "submitted" | "completed" | "failed";
  executionId?: string;
  transactionHash?: string;
  error?: string;
  // anything else is opaque
  [key: string]: unknown;
}

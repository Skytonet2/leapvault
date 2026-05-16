export type AIProviderName = "nvidia" | "ollama" | "local-ollama" | "openai";

export type AIRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  /** Optional callsite tag used for telemetry / cache key namespacing. */
  feature?: string;
}

export interface AIResponse {
  content: string;
  provider: AIProviderName;
  model: string;
  tokensUsed?: number;
  costEstimate?: number;
  latencyMs?: number;
  /** Set when the response came from the AICache and AI was not called. */
  cached?: boolean;
}

export interface AIProvider {
  readonly name: AIProviderName;
  readonly model: string;
  /** Cheap, non-billed check the router uses for health probing. */
  isConfigured(): boolean;
  generate(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
}

export type AIError =
  | { kind: "not-configured"; provider: AIProviderName; message: string }
  | { kind: "timeout"; provider: AIProviderName; message: string }
  | { kind: "rate-limit"; provider: AIProviderName; message: string }
  | { kind: "upstream"; provider: AIProviderName; message: string; status?: number }
  | { kind: "validation"; provider: AIProviderName; message: string }
  | { kind: "limit-exceeded"; provider: AIProviderName; message: string };

export class AIProviderError extends Error {
  public readonly error: AIError;
  constructor(error: AIError) {
    super(error.message);
    this.error = error;
    this.name = "AIProviderError";
  }
}

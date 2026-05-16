import "server-only";
import type {
  AIMessage,
  AIOptions,
  AIProvider,
  AIProviderName,
  AIResponse,
} from "../types";
import { AIProviderError } from "../types";

/**
 * Shared client for any provider that speaks the OpenAI Chat Completions API:
 *   - OpenAI itself
 *   - NVIDIA Build / NIM (`integrate.api.nvidia.com/v1`)
 *   - Ollama Cloud (`ollama.com/v1`, when API-keyed)
 *   - Local Ollama via its OpenAI-compat shim (`/v1/chat/completions`)
 *
 * Concrete providers are thin wrappers in providers/*.ts that pass the right
 * env-derived (apiKey, baseUrl, model, providerName) tuple.
 */

export interface OpenAICompatibleConfig {
  providerName: AIProviderName;
  apiKey?: string;
  baseUrl: string;
  model: string;
  /** Whether the provider rejects unknown fields like `response_format`. */
  supportsJsonMode?: boolean;
  /** Some providers (local Ollama) accept calls with no key. */
  keyOptional?: boolean;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: AIProviderName;
  readonly model: string;
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
    this.name = config.providerName;
    this.model = config.model;
  }

  isConfigured(): boolean {
    if (!this.config.baseUrl || !this.config.model) return false;
    if (this.config.keyOptional) return true;
    return Boolean(this.config.apiKey);
  }

  async generate(messages: AIMessage[], options: AIOptions = {}): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new AIProviderError({
        kind: "not-configured",
        provider: this.name,
        message: `${this.name} is not configured. Missing API key, base URL, or model.`,
      });
    }

    // Default 90s. Heavier prompts (RWA report with structured risk breakdown)
    // routinely take 50 to 70s on NVIDIA's GLM-5.1 cold path.
    const timeoutMs = options.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS ?? 90_000);

    // Single retry on timeout. Most cold-start failures resolve when the
    // provider warms up the model on the second hit.
    try {
      return await this.attempt(messages, options, timeoutMs);
    } catch (e) {
      if (e instanceof AIProviderError && e.error.kind === "timeout") {
        return await this.attempt(messages, options, timeoutMs);
      }
      throw e;
    }
  }

  private async attempt(
    messages: AIMessage[],
    options: AIOptions,
    timeoutMs: number,
  ): Promise<AIResponse> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: options.temperature ?? Number(process.env.AI_TEMPERATURE ?? 0.2),
      max_tokens: options.maxTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 1200),
      stream: false,
    };
    if (options.jsonMode && this.config.supportsJsonMode !== false) {
      body.response_format = { type: "json_object" };
    }

    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    const started = Date.now();

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new AIProviderError({
            kind: "rate-limit",
            provider: this.name,
            message: `Rate limited by ${this.name}.`,
          });
        }
        const text = await safeText(res);
        throw new AIProviderError({
          kind: "upstream",
          provider: this.name,
          status: res.status,
          message: `${this.name} returned ${res.status}: ${truncate(text, 240)}`,
        });
      }

      const json = (await res.json()) as ChatCompletionResponse;
      const content = json.choices?.[0]?.message?.content ?? "";
      const usage = json.usage;

      return {
        content,
        provider: this.name,
        model: json.model ?? this.model,
        tokensUsed: usage?.total_tokens,
        latencyMs: Date.now() - started,
      };
    } catch (e) {
      if (e instanceof AIProviderError) throw e;
      if ((e as Error).name === "AbortError") {
        throw new AIProviderError({
          kind: "timeout",
          provider: this.name,
          message: `${this.name} request timed out after ${timeoutMs}ms.`,
        });
      }
      throw new AIProviderError({
        kind: "upstream",
        provider: this.name,
        message: `${this.name} request failed: ${(e as Error).message}`,
      });
    } finally {
      clearTimeout(to);
    }
  }
}

interface ChatCompletionResponse {
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

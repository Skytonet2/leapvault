import "server-only";
import {
  type AIMessage,
  type AIOptions,
  type AIProvider,
  type AIProviderName,
  type AIResponse,
  AIProviderError,
} from "./types";
import { createNvidiaProvider } from "./providers/nvidia";
import { createOllamaProvider } from "./providers/ollama";
import { createLocalOllamaProvider } from "./providers/local-ollama";
import { createOpenAIProvider } from "./providers/openai";
import {
  checkUserAILimit,
  createPromptHash,
  estimateTokenUsage,
  getCachedAIResponse,
  recordUsage,
  saveCachedAIResponse,
} from "./cost-control";
import { enforceNoAdvicePolicy } from "./safety";

const REGISTRY: Record<AIProviderName, () => AIProvider> = {
  nvidia: createNvidiaProvider,
  ollama: createOllamaProvider,
  "local-ollama": createLocalOllamaProvider,
  openai: createOpenAIProvider,
};

let cached: Partial<Record<AIProviderName, AIProvider>> = {};

export function getProvider(name: AIProviderName): AIProvider {
  if (!cached[name]) cached[name] = REGISTRY[name]();
  return cached[name]!;
}

function primaryName(): AIProviderName {
  return (process.env.AI_PROVIDER as AIProviderName) || "nvidia";
}

function fallbackName(): AIProviderName | null {
  const f = process.env.AI_FALLBACK_PROVIDER as AIProviderName | undefined;
  return f && f !== primaryName() ? f : null;
}

export interface RouterCallOptions extends AIOptions {
  feature: string;
  userWallet?: string | null;
  /** Skip the input-hash cache for this call. */
  noCache?: boolean;
}

export async function generate(
  messages: AIMessage[],
  options: RouterCallOptions,
): Promise<AIResponse> {
  const userWallet = options.userWallet ?? null;
  const usage = checkUserAILimit(userWallet);
  if (!usage.allowed) {
    throw new AIProviderError({
      kind: "limit-exceeded",
      provider: primaryName(),
      message: `Daily AI limit reached (${usage.used}/${usage.limit}).`,
    });
  }

  const primary = getProvider(primaryName());
  const inputHash = createPromptHash(messages, options.feature, primary.model);
  if (!options.noCache && process.env.AI_ENABLE_CACHE !== "false") {
    const hit = getCachedAIResponse(inputHash, options.feature);
    if (hit) return { ...hit.response, cached: true };
  }

  const order: AIProvider[] = [];
  if (primary.isConfigured()) order.push(primary);
  const fb = fallbackName();
  if (fb) {
    const fbProvider = getProvider(fb);
    if (fbProvider.isConfigured()) order.push(fbProvider);
  }

  if (order.length === 0) {
    throw new AIProviderError({
      kind: "not-configured",
      provider: primary.name,
      message: "No AI provider is configured. Set AI_PROVIDER and provider credentials.",
    });
  }

  let lastError: unknown;
  for (const provider of order) {
    try {
      const raw = await provider.generate(messages, options);
      const safe = enforceNoAdvicePolicy(raw.content);
      const final: AIResponse = { ...raw, content: safe.text };

      recordUsage({
        userWallet,
        feature: options.feature,
        provider: provider.name,
        model: provider.model,
        inputTokens: estimateTokenUsage(messages.map((m) => m.content).join("\n")),
        outputTokens: estimateTokenUsage(final.content),
        estimatedCost: 0,
      });

      if (!options.noCache) saveCachedAIResponse(inputHash, options.feature, final);
      return final;
    } catch (e) {
      lastError = e;
      // Try the next provider only for transient failures.
      if (e instanceof AIProviderError && (e.error.kind === "not-configured" || e.error.kind === "validation")) {
        continue;
      }
      if (e instanceof AIProviderError && (e.error.kind === "timeout" || e.error.kind === "upstream" || e.error.kind === "rate-limit")) {
        continue;
      }
      throw e;
    }
  }

  if (lastError instanceof AIProviderError) throw lastError;
  throw new AIProviderError({
    kind: "upstream",
    provider: order[0]?.name ?? primary.name,
    message: `All AI providers failed: ${(lastError as Error)?.message ?? "unknown"}`,
  });
}

export interface ProviderStatus {
  name: AIProviderName;
  model: string;
  configured: boolean;
  isPrimary: boolean;
  isFallback: boolean;
}

export function getProviderStatuses(): ProviderStatus[] {
  const p = primaryName();
  const f = fallbackName();
  const names: AIProviderName[] = ["nvidia", "ollama", "local-ollama", "openai"];
  return names.map((name) => {
    const provider = getProvider(name);
    return {
      name,
      model: provider.model,
      configured: provider.isConfigured(),
      isPrimary: name === p,
      isFallback: name === f,
    };
  });
}

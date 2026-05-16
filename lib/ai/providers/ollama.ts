import "server-only";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider } from "../types";

/**
 * Ollama Cloud (`ollama.com`). Uses the `/v1` OpenAI-compatible endpoint so we
 * can route through the shared chat-completions client. Default model is
 * `glm-5.1:cloud` for parity with the NVIDIA premium tier.
 */
export function createOllamaProvider(): AIProvider {
  const base = (process.env.OLLAMA_BASE_URL || "https://ollama.com").replace(/\/$/, "");
  const baseUrl = base.endsWith("/v1") ? base : `${base}/v1`;
  return new OpenAICompatibleProvider({
    providerName: "ollama",
    apiKey: process.env.OLLAMA_API_KEY,
    baseUrl,
    model: process.env.OLLAMA_MODEL || "glm-5.1:cloud",
    supportsJsonMode: false,
  });
}

import "server-only";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider } from "../types";

/**
 * Local Ollama via the OpenAI-compatible shim served at
 * `http://localhost:11434/v1`. Requires no API key.
 */
export function createLocalOllamaProvider(): AIProvider {
  const base = (
    process.env.LOCAL_OLLAMA_BASE_URL || "http://localhost:11434"
  ).replace(/\/$/, "");
  const baseUrl = base.endsWith("/v1") ? base : `${base}/v1`;
  const model = process.env.LOCAL_OLLAMA_MODEL || process.env.AI_MODEL_LOCAL || "";
  return new OpenAICompatibleProvider({
    providerName: "local-ollama",
    baseUrl,
    model,
    keyOptional: true,
    supportsJsonMode: false,
  });
}

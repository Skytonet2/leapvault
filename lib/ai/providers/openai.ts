import "server-only";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider } from "../types";

export function createOpenAIProvider(): AIProvider {
  return new OpenAICompatibleProvider({
    providerName: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL_PRIMARY || "gpt-4o-mini",
    supportsJsonMode: true,
  });
}

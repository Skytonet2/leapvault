import "server-only";
import { OpenAICompatibleProvider } from "./openai-compatible";
import type { AIProvider } from "../types";

/**
 * NVIDIA Build / NIM provider. Treats GLM-5.1 as the default premium reasoning
 * model for LeapVault Agent (RWA reports, multi-step risk analysis, etc.).
 *
 * NVIDIA's hosted endpoint is OpenAI-compatible, so we share the base client.
 */
export function createNvidiaProvider(): AIProvider {
  return new OpenAICompatibleProvider({
    providerName: "nvidia",
    apiKey: process.env.NVIDIA_API_KEY,
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    model: process.env.NVIDIA_MODEL || process.env.AI_MODEL_PRIMARY || "z-ai/glm5.1",
    supportsJsonMode: false,
  });
}

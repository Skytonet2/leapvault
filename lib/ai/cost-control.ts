import "server-only";
import { createHash } from "node:crypto";

/**
 * AI cost discipline:
 *   - Hash inputs → reuse cached outputs.
 *   - Per-user daily limit pulled from AI_DAILY_USER_LIMIT.
 *   - Token estimates use a conservative ~4 chars/token heuristic; replace with
 *     the provider's tokenizer once needed.
 *
 * The store is intentionally in-memory and process-local. The interface is the
 * stable surface area — back it with the AICache + AIUsageLog tables once the
 * database adapter is wired.
 */

import type { AIMessage, AIResponse } from "./types";

export interface CachedAIResponse {
  inputHash: string;
  feature: string;
  response: AIResponse;
  createdAt: number;
  expiresAt: number | null;
}

export interface UsageRecord {
  userWallet: string | null;
  feature: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  createdAt: number;
}

const cacheStore = new Map<string, CachedAIResponse>();
const usageStore: UsageRecord[] = [];

function dailyKey(userWallet: string | null): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${userWallet ?? "anon"}:${day}`;
}

const dailyCounts = new Map<string, number>();

export function createPromptHash(messages: AIMessage[], feature: string, model: string): string {
  const payload = JSON.stringify({ messages, feature, model });
  return createHash("sha256").update(payload).digest("hex");
}

export function getCachedAIResponse(
  inputHash: string,
  feature: string,
): CachedAIResponse | null {
  if (process.env.AI_ENABLE_CACHE === "false") return null;
  const entry = cacheStore.get(`${feature}:${inputHash}`);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt < Date.now()) {
    cacheStore.delete(`${feature}:${inputHash}`);
    return null;
  }
  return entry;
}

export function saveCachedAIResponse(
  inputHash: string,
  feature: string,
  response: AIResponse,
  ttlMs = 1000 * 60 * 60 * 24,
): void {
  cacheStore.set(`${feature}:${inputHash}`, {
    inputHash,
    feature,
    response,
    createdAt: Date.now(),
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null,
  });
}

export function estimateTokenUsage(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function checkUserAILimit(userWallet: string | null): {
  allowed: boolean;
  used: number;
  limit: number;
} {
  const limit = Number(process.env.AI_DAILY_USER_LIMIT ?? "100");
  const used = dailyCounts.get(dailyKey(userWallet)) ?? 0;
  return { allowed: used < limit, used, limit };
}

export function recordUsage(record: Omit<UsageRecord, "createdAt">): void {
  const entry: UsageRecord = { ...record, createdAt: Date.now() };
  usageStore.push(entry);
  const key = dailyKey(record.userWallet);
  dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
}

export function shouldRegenerateExplanation(
  lastInputHash: string | null,
  currentInputHash: string,
): boolean {
  return lastInputHash !== currentInputHash;
}

export function getRecentUsage(limit = 20): UsageRecord[] {
  return usageStore.slice(-limit).reverse();
}

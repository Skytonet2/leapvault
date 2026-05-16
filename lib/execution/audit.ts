import "server-only";

import type { ExecutionLogEntry } from "./types";

/**
 * Audit logging for execution attempts.
 *
 * The DB adapter writes the real row. This module shapes the payload and is
 * the only place that scrubs internal secrets before persistence.
 */

const SENSITIVE_KEYS = new Set([
  "api_key",
  "apiKey",
  "secret",
  "password",
  "authorization",
  "token",
  "telegram_bot_token",
  "realclaw_api_key",
]);

export function scrubPayload<T extends Record<string, unknown>>(payload: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = "[redacted]";
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = scrubPayload(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function buildLogEntry(
  partial: Omit<ExecutionLogEntry, "id" | "createdAt">,
): Omit<ExecutionLogEntry, "id" | "createdAt"> {
  return {
    ...partial,
    requestPayload: scrubPayload(partial.requestPayload ?? {}),
    responsePayload: partial.responsePayload
      ? scrubPayload(partial.responsePayload as Record<string, unknown>)
      : null,
  };
}

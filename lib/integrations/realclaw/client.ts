import "server-only";

import type {
  RealClawClientConfig,
  RealClawSubmitRequest,
  RealClawSubmitResponse,
} from "./types";

export function readRealClawConfig(): RealClawClientConfig {
  return {
    enabled: (process.env.REALCLAW_ENABLED ?? "").toLowerCase() === "true",
    baseUrl: process.env.REALCLAW_BASE_URL ?? "",
    apiKey: process.env.REALCLAW_API_KEY ?? "",
    webhookSecret: process.env.REALCLAW_WEBHOOK_SECRET ?? "",
    telegramBotUsername: process.env.REALCLAW_TELEGRAM_BOT_USERNAME ?? "",
    sessionId: process.env.REALCLAW_SESSION_ID ?? "",
  };
}

export function isRealClawConfigured(cfg: RealClawClientConfig = readRealClawConfig()): boolean {
  if (!cfg.enabled) return false;
  if (!cfg.baseUrl) return false;
  if (!cfg.apiKey && !cfg.sessionId) return false;
  return true;
}

interface FetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function authedFetch(
  cfg: RealClawClientConfig,
  path: string,
  init: RequestInit,
  opts: FetchOptions = {},
): Promise<Response> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30_000);
  try {
    const res = await fetch(joinUrl(cfg.baseUrl, path), {
      ...init,
      signal: opts.signal ?? ctrl.signal,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: cfg.apiKey ? `Bearer ${cfg.apiKey}` : "",
        "x-session-id": cfg.sessionId,
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

/**
 * Health check. RealClaw's public API surface isn't fully documented for the
 * "/health" route — fall back to a HEAD on the base URL. Any 2xx/3xx response
 * counts as reachable.
 */
export async function realClawHealth(cfg: RealClawClientConfig = readRealClawConfig()): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
}> {
  if (!isRealClawConfigured(cfg)) {
    return { ok: false, latencyMs: 0, message: "RealClaw is not configured." };
  }
  const start = Date.now();
  try {
    const res = await authedFetch(cfg, "/health", { method: "GET" }, { timeoutMs: 8000 });
    const latency = Date.now() - start;
    if (res.ok || (res.status >= 200 && res.status < 400)) {
      return { ok: true, latencyMs: latency, message: "RealClaw endpoint reachable." };
    }
    return {
      ok: false,
      latencyMs: latency,
      message: `RealClaw health returned HTTP ${res.status}.`,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      message: `RealClaw health failed: ${(e as Error).message}`,
    };
  }
}

/**
 * Submit an approved proposal to RealClaw.
 *
 * Endpoint shape is provisional — adjust the path once RealClaw publishes its
 * formal v1 spec. The adapter is the only caller; the route is centralized
 * here so tests can mock a single seam.
 */
export async function realClawSubmit(
  body: RealClawSubmitRequest,
  cfg: RealClawClientConfig = readRealClawConfig(),
  opts: FetchOptions = {},
): Promise<RealClawSubmitResponse> {
  if (!isRealClawConfigured(cfg)) {
    throw new Error("RealClaw is not configured.");
  }
  // TODO: confirm endpoint name with RealClaw / Byreal documentation.
  const res = await authedFetch(
    cfg,
    "/v1/executions",
    { method: "POST", body: JSON.stringify(body) },
    opts,
  );
  const text = await res.text();
  let parsed: RealClawSubmitResponse;
  try {
    parsed = text ? (JSON.parse(text) as RealClawSubmitResponse) : {};
  } catch {
    parsed = { status: "failed", error: `Non-JSON response: ${text.slice(0, 200)}` };
  }
  if (!res.ok) {
    parsed.status = "failed";
    parsed.error = parsed.error ?? `HTTP ${res.status}`;
  }
  return parsed;
}

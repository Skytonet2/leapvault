import "server-only";

import type { ProviderHealth } from "@/lib/execution/types";
import { isRealClawConfigured, readRealClawConfig, realClawHealth } from "./client";

export async function getRealClawHealth(): Promise<ProviderHealth> {
  const cfg = readRealClawConfig();
  const checkedAt = new Date().toISOString();
  if (!isRealClawConfigured(cfg)) {
    return {
      provider: "realclaw",
      status: "not-configured",
      latencyMs: null,
      message: cfg.enabled
        ? "REALCLAW_ENABLED is true but base URL or API key are missing."
        : "RealClaw execution is disabled (REALCLAW_ENABLED=false).",
      checkedAt,
    };
  }
  const probe = await realClawHealth(cfg);
  return {
    provider: "realclaw",
    status: probe.ok ? "online" : "offline",
    latencyMs: probe.latencyMs,
    message: probe.message,
    checkedAt,
  };
}

import "server-only";

import { spawn } from "node:child_process";
import type { ByrealCliConfig, ByrealCliResult, ByrealCommandTemplate } from "./types";
import { findTemplateByName } from "./capabilities";

export function readByrealConfig(): ByrealCliConfig {
  return {
    enabled: (process.env.BYREAL_SKILLS_ENABLED ?? "").toLowerCase() === "true",
    cliPath: process.env.BYREAL_CLI_PATH ?? "byreal",
    skillsRepo: process.env.BYREAL_SKILLS_REPO ?? "byreal-git/byreal-agent-skills",
    outputMode:
      (process.env.BYREAL_OUTPUT_MODE ?? "json").toLowerCase() === "text" ? "text" : "json",
  };
}

export function isByrealConfigured(cfg: ByrealCliConfig = readByrealConfig()): boolean {
  return cfg.enabled && Boolean(cfg.cliPath);
}

/**
 * Strict allowlist for CLI argument values.
 *
 * Allowed characters: alphanumerics, `_`, `-`, `.`, `,`, `:`, and `0x...` hex.
 * Anything else is rejected before the value reaches `spawn`. We never use a
 * shell — args are passed as an array — but this is defense in depth.
 */
const SAFE_VALUE_RE = /^[A-Za-z0-9_\-.,:0xX]+$/;

function safeStringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 256) return null;
  if (!SAFE_VALUE_RE.test(value)) return null;
  return value;
}

function buildArgs(
  template: ByrealCommandTemplate,
  params: Record<string, unknown>,
  outputMode: ByrealCliConfig["outputMode"],
): string[] | { error: string } {
  const args: string[] = [template.command];
  for (const key of template.allowedParams) {
    if (!(key in params)) continue;
    const raw = params[key];
    const safe = safeStringify(raw);
    if (safe === null) {
      return { error: `Param "${key}" failed validation.` };
    }
    args.push(`--${key}`, safe);
  }
  if (outputMode === "json") {
    args.push("--json");
  }
  return args;
}

/**
 * Run a whitelisted Byreal command.
 *
 * - command must be in BYREAL_COMMAND_TEMPLATES
 * - every param key must be in the template's allowedParams
 * - every param value must match the safe-value regex
 * - no shell is used; args are an array
 * - timeout enforced
 */
export async function runByrealCommand<T = unknown>(input: {
  command: ByrealCommandTemplate["command"];
  params?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ByrealCliResult<T>> {
  const cfg = readByrealConfig();
  const template = findTemplateByName(input.command);
  const start = Date.now();

  if (!template) {
    return {
      ok: false,
      command: input.command,
      durationMs: 0,
      parsed: null,
      rawStdout: "",
      rawStderr: "",
      errorMessage: `Unknown Byreal command: ${input.command}`,
    };
  }
  if (!isByrealConfigured(cfg)) {
    return {
      ok: false,
      command: input.command,
      durationMs: 0,
      parsed: null,
      rawStdout: "",
      rawStderr: "",
      errorMessage: "Byreal Skills CLI is not configured.",
    };
  }

  const argsOrError = buildArgs(template, input.params ?? {}, cfg.outputMode);
  if (!Array.isArray(argsOrError)) {
    return {
      ok: false,
      command: input.command,
      durationMs: 0,
      parsed: null,
      rawStdout: "",
      rawStderr: "",
      errorMessage: argsOrError.error,
    };
  }

  return new Promise<ByrealCliResult<T>>((resolve) => {
    let stdout = "";
    let stderr = "";
    const timeoutMs = input.timeoutMs ?? 30_000;

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cfg.cliPath, argsOrError, {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      });
    } catch (e) {
      resolve({
        ok: false,
        command: template.command,
        durationMs: Date.now() - start,
        parsed: null,
        rawStdout: "",
        rawStderr: "",
        errorMessage: `Failed to spawn CLI: ${(e as Error).message}`,
      });
      return;
    }

    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (e) => {
      clearTimeout(killTimer);
      resolve({
        ok: false,
        command: template.command,
        durationMs: Date.now() - start,
        parsed: null,
        rawStdout: stdout,
        rawStderr: stderr,
        errorMessage: e.message,
      });
    });
    child.on("close", (code) => {
      clearTimeout(killTimer);
      const ok = code === 0;
      let parsed: T | null = null;
      if (ok && cfg.outputMode === "json" && stdout.trim().length > 0) {
        try {
          parsed = JSON.parse(stdout) as T;
        } catch {
          parsed = null;
        }
      }
      resolve({
        ok,
        command: template.command,
        durationMs: Date.now() - start,
        parsed,
        rawStdout: stdout,
        rawStderr: stderr,
        errorMessage: ok ? null : `CLI exited with code ${code}`,
      });
    });
  });
}

export async function byrealHealthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
}> {
  const cfg = readByrealConfig();
  if (!isByrealConfigured(cfg)) {
    return { ok: false, latencyMs: 0, message: "Byreal Skills CLI is not configured." };
  }
  const start = Date.now();
  const result = await runByrealCommand({ command: "queryTokens", timeoutMs: 6000 });
  const latency = Date.now() - start;
  if (result.ok) {
    return { ok: true, latencyMs: latency, message: "Byreal CLI responded." };
  }
  return {
    ok: false,
    latencyMs: latency,
    message: result.errorMessage ?? "Byreal CLI returned an error.",
  };
}

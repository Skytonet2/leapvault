import type { ExecutionActionType } from "@/lib/execution/types";

export type ByrealCommandName =
  | "queryPools"
  | "queryTokens"
  | "analyzePoolRisk"
  | "getWalletBalance"
  | "executeSwap"
  | "openLpPosition"
  | "closeLpPosition"
  | "claimRewards";

export interface ByrealCliConfig {
  enabled: boolean;
  cliPath: string;
  skillsRepo: string;
  outputMode: "json" | "text";
}

/**
 * A template binds an action type to a CLI command + the allowed param keys.
 *
 * The adapter ONLY ever runs commands defined here; unknown commands are
 * rejected. Param values are passed positionally / via --flag style so a
 * malicious key cannot expand into shell metacharacters.
 */
export interface ByrealCommandTemplate {
  command: ByrealCommandName;
  actionType: ExecutionActionType | "discover";
  allowedParams: readonly string[];
  description: string;
}

export interface ByrealCliResult<T = unknown> {
  ok: boolean;
  command: ByrealCommandName;
  durationMs: number;
  parsed: T | null;
  rawStdout: string;
  rawStderr: string;
  errorMessage: string | null;
}

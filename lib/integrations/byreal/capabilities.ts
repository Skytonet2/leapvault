import type { ByrealCommandTemplate } from "./types";

/**
 * Whitelisted Byreal CLI commands. The adapter cannot run anything outside
 * this list — every command must be declared here with its exact name and
 * the param keys we are willing to forward.
 *
 * NOTE: param naming follows the Byreal Agent Skills public docs. If a flag
 * name changes upstream, only this table needs to be updated.
 */
export const BYREAL_COMMAND_TEMPLATES: readonly ByrealCommandTemplate[] = [
  {
    command: "queryPools",
    actionType: "discover",
    allowedParams: ["network", "tokenA", "tokenB"],
    description: "List available pools, optionally filtered by tokens.",
  },
  {
    command: "queryTokens",
    actionType: "discover",
    allowedParams: ["network", "symbol"],
    description: "List supported tokens or look up a token by symbol.",
  },
  {
    command: "analyzePoolRisk",
    actionType: "risk_report",
    allowedParams: ["poolAddress", "network"],
    description: "Run a structured risk analysis on a Byreal pool.",
  },
  {
    command: "getWalletBalance",
    actionType: "discover",
    allowedParams: ["wallet", "network"],
    description: "Get a wallet's balance via the configured Byreal adapter.",
  },
  {
    command: "executeSwap",
    actionType: "swap",
    allowedParams: ["tokenIn", "tokenOut", "amount", "slippageBps", "recipient", "network"],
    description: "Execute a swap through Byreal Skills (requires approval).",
  },
  {
    command: "openLpPosition",
    actionType: "open_lp_position",
    allowedParams: ["poolAddress", "amountIn", "lowerTick", "upperTick", "network"],
    description: "Open a CLMM position with approved bounds.",
  },
  {
    command: "closeLpPosition",
    actionType: "close_lp_position",
    allowedParams: ["positionId", "network"],
    description: "Close a CLMM position approved by the user.",
  },
  {
    command: "claimRewards",
    actionType: "claim_rewards",
    allowedParams: ["positionId", "network"],
    description: "Claim accrued rewards for an LP position.",
  },
] as const;

export function findTemplateForAction(
  actionType: ByrealCommandTemplate["actionType"],
): ByrealCommandTemplate | null {
  return (
    BYREAL_COMMAND_TEMPLATES.find((t) => t.actionType === actionType) ?? null
  );
}

export function findTemplateByName(
  command: ByrealCommandTemplate["command"],
): ByrealCommandTemplate | null {
  return BYREAL_COMMAND_TEMPLATES.find((t) => t.command === command) ?? null;
}

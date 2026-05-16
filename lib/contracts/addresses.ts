import type { Address } from "viem";

export type ContractKey = "agentRegistry" | "taskRegistry" | "reputationRegistry";

/**
 * Contract addresses are exclusively read from the environment so the same
 * frontend binary can target testnet or mainnet without code changes.
 */
function envAddress(value: string | undefined): Address | null {
  if (!value) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as Address;
}

export const contractAddresses: Record<ContractKey, Address | null> = {
  agentRegistry: envAddress(process.env.AGENT_REGISTRY_CONTRACT),
  taskRegistry: envAddress(process.env.TASK_REGISTRY_CONTRACT),
  reputationRegistry: envAddress(process.env.REPUTATION_CONTRACT),
};

export function isContractConfigured(key: ContractKey): boolean {
  return contractAddresses[key] !== null;
}

export function requireContract(key: ContractKey): Address {
  const a = contractAddresses[key];
  if (!a) {
    const envVar = key === "agentRegistry"
      ? "AGENT_REGISTRY_CONTRACT"
      : key === "taskRegistry"
        ? "TASK_REGISTRY_CONTRACT"
        : "REPUTATION_CONTRACT";
    throw new Error(`Contract '${key}' is not configured. Set ${envVar}.`);
  }
  return a;
}

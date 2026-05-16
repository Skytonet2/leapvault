import "server-only";

import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Resolves the active Mantle network for on-chain anchor calls.
 *
 * Switching between Sepolia and mainnet is driven by NEXT_PUBLIC_MANTLE_NETWORK
 * (same env var the UI uses), so anchor txs always target the network the
 * frontend is reading from.
 */

export type MantleTarget = "mantle" | "mantle-sepolia";

export const mantleAnchor = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MANTLE_RPC_URL || "https://rpc.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.mantle.xyz" },
  },
});

export const mantleSepoliaAnchor = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  },
  testnet: true,
});

export function getActiveChain() {
  return process.env.NEXT_PUBLIC_MANTLE_NETWORK === "mantle"
    ? mantleAnchor
    : mantleSepoliaAnchor;
}

export function getAnchorPublicClient() {
  return createPublicClient({ chain: getActiveChain(), transport: http() });
}

export function getAnchorWalletClient() {
  const raw = process.env.MANTLE_ANCHOR_PRIVATE_KEY;
  if (!raw) return null;
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  const account = privateKeyToAccount(key);
  return createWalletClient({ chain: getActiveChain(), account, transport: http() });
}

export function explorerTxUrl(hash: string): string {
  return `${getActiveChain().blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${getActiveChain().blockExplorers.default.url}/address/${address}`;
}

export function contractsConfigured(): boolean {
  return Boolean(
    process.env.AGENT_REGISTRY_CONTRACT &&
      process.env.REPUTATION_CONTRACT &&
      process.env.MANTLE_ANCHOR_PRIVATE_KEY,
  );
}

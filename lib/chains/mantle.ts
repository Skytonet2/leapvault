import { defineChain } from "viem";

/**
 * Mantle Mainnet. RPC URL is environment-driven so deployments
 * can swap to private or paid RPCs without rebuilding the app.
 */
export const mantle = defineChain({
  id: 5000,
  name: "Mantle",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MANTLE_RPC_URL || "https://rpc.mantle.xyz",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.mantle.xyz" },
  },
  testnet: false,
});

export const mantleSepolia = defineChain({
  id: 5003,
  name: "Mantle Sepolia",
  nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL ||
          "https://rpc.sepolia.mantle.xyz",
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

export const supportedChains = [mantle, mantleSepolia] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export function isSupportedChainId(id: number | undefined): id is SupportedChainId {
  return id === mantle.id || id === mantleSepolia.id;
}

export function getDefaultChain() {
  const pref = process.env.NEXT_PUBLIC_DEFAULT_NETWORK;
  if (pref === "mantle") return mantle;
  return mantleSepolia;
}

export function explorerLink(chainId: number, kind: "tx" | "address" | "token", value: string) {
  const base =
    chainId === mantle.id
      ? mantle.blockExplorers.default.url
      : mantleSepolia.blockExplorers.default.url;
  return `${base}/${kind === "tx" ? "tx" : kind}/${value}`;
}

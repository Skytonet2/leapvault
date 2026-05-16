import "server-only";

import { createPublicClient, http, type Address } from "viem";
import { erc20Abi } from "viem";
import { mantle, mantleSepolia, explorerLink } from "@/lib/chains/mantle";
import type { ServiceResult } from "@/types/common";

const transports = {
  [mantle.id]: http(process.env.NEXT_PUBLIC_MANTLE_RPC_URL || "https://rpc.mantle.xyz"),
  [mantleSepolia.id]: http(
    process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz",
  ),
};

const clients = new Map<number, ReturnType<typeof createPublicClient>>();

function clientFor(chainId: number) {
  let c = clients.get(chainId);
  if (c) return c;
  const chain = chainId === mantle.id ? mantle : mantleSepolia;
  c = createPublicClient({
    chain,
    transport: transports[chainId as keyof typeof transports],
  });
  clients.set(chainId, c);
  return c;
}

export async function readTokenBalance(args: {
  chainId: number;
  token: Address;
  account: Address;
}): Promise<ServiceResult<{ balance: bigint; decimals: number; symbol: string }>> {
  try {
    const client = clientFor(args.chainId);
    const [balance, decimals, symbol] = await Promise.all([
      client.readContract({ address: args.token, abi: erc20Abi, functionName: "balanceOf", args: [args.account] }),
      client.readContract({ address: args.token, abi: erc20Abi, functionName: "decimals" }),
      client.readContract({ address: args.token, abi: erc20Abi, functionName: "symbol" }),
    ]);
    return { ok: true, data: { balance: balance as bigint, decimals: Number(decimals), symbol: String(symbol) } };
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "upstream",
        message: `Failed to read token balance: ${(e as Error).message}`,
      },
    };
  }
}

export async function readContract<T = unknown>(args: {
  chainId: number;
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}): Promise<ServiceResult<T>> {
  try {
    const client = clientFor(args.chainId);
    const result = (await client.readContract({
      address: args.address,
      // viem accepts abi as Abi[]; cast through unknown for ergonomic call sites.
      abi: args.abi as never,
      functionName: args.functionName,
      args: args.args as never,
    })) as T;
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: {
        kind: "upstream",
        message: `Contract read failed: ${(e as Error).message}`,
      },
    };
  }
}

/**
 * Wallet transaction history is not exposed by a vanilla JSON-RPC node. Real
 * implementations should plug in a Mantle-aware indexer (e.g. the official
 * explorer API or a subgraph). Until then we return `not-configured` so the UI
 * shows a setup state instead of fabricated transactions.
 */
export async function readWalletTransactions(_args: {
  chainId: number;
  account: Address;
  limit?: number;
}): Promise<ServiceResult<never[]>> {
  return {
    ok: false,
    error: {
      kind: "not-configured",
      message: "Wallet history requires a Mantle indexer.",
      hint: "Wire an explorer/subgraph adapter in lib/services/mantle.ts.",
    },
  };
}

export function getExplorerLink(
  chainId: number,
  kind: "tx" | "address" | "token",
  value: string,
): string {
  return explorerLink(chainId, kind, value);
}

import "server-only";

import { keccak256, stringToBytes, type Address, type Hex } from "viem";
import { SubscriptionRegistryAbi } from "@/lib/contracts/artifacts";
import { getActiveChain, getAnchorPublicClient } from "@/lib/contracts/network";

/**
 * Server-side reads against SubscriptionRegistry. The user's wallet does all
 * the writing (subscribe) client-side via wagmi + AppKit, so we only need
 * read helpers here. All return null when the contract isn't configured,
 * letting the marketplace stay usable in dev without the payment layer.
 */

export interface SubscriptionPlan {
  /** Per-month price in wei. 0 means no plan / free agent. */
  pricePerMonth: bigint;
  recipient: Address;
  active: boolean;
}

function slugHash(slug: string): Hex {
  return keccak256(stringToBytes(slug));
}

function contractAddress(): Address | null {
  const addr = process.env.SUBSCRIPTION_CONTRACT;
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;
  return addr as Address;
}

export function subscriptionsConfigured(): boolean {
  return contractAddress() !== null;
}

export async function getPlan(slug: string): Promise<SubscriptionPlan | null> {
  const addr = contractAddress();
  if (!addr) return null;
  try {
    const client = getAnchorPublicClient();
    const result = (await client.readContract({
      address: addr,
      abi: SubscriptionRegistryAbi,
      functionName: "getPlan",
      args: [slugHash(slug)],
    })) as { pricePerMonth: bigint; recipient: Address; active: boolean };
    return {
      pricePerMonth: result.pricePerMonth,
      recipient: result.recipient,
      active: result.active,
    };
  } catch {
    return null;
  }
}

export async function isSubscribed(
  slug: string,
  user: Address,
): Promise<boolean> {
  const addr = contractAddress();
  if (!addr) return false;
  try {
    const client = getAnchorPublicClient();
    return (await client.readContract({
      address: addr,
      abi: SubscriptionRegistryAbi,
      functionName: "isActive",
      args: [slugHash(slug), user],
    })) as boolean;
  } catch {
    return false;
  }
}

export async function getExpiresAt(
  slug: string,
  user: Address,
): Promise<number | null> {
  const addr = contractAddress();
  if (!addr) return null;
  try {
    const client = getAnchorPublicClient();
    const expiry = (await client.readContract({
      address: addr,
      abi: SubscriptionRegistryAbi,
      functionName: "expiresAt",
      args: [slugHash(slug), user],
    })) as bigint;
    if (expiry === 0n) return null;
    return Number(expiry);
  } catch {
    return null;
  }
}

export function getSubscriptionContractAddress(): Address | null {
  return contractAddress();
}

export function getActiveChainName(): string {
  return getActiveChain().name;
}

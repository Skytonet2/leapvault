import "server-only";

import { createHash } from "node:crypto";
import { keccak256, stringToBytes, type Address, type Hex } from "viem";
import { ReputationRegistryAbi } from "@/lib/contracts/artifacts";
import {
  contractsConfigured,
  getActiveChain,
  getAnchorPublicClient,
  getAnchorWalletClient,
} from "@/lib/contracts/network";

/**
 * On-chain reputation anchor.
 *
 * Best-effort, server-only writes to ReputationRegistry. Called from
 * reputation-events.ts after every score recompute. Never blocks the
 * user request: failures are logged and swallowed so the caller can
 * still return success.
 *
 * Layer ordering:
 *   DB recompute (source of truth)
 *     -> sha256 evidence hash
 *     -> walletClient.writeContract(...)
 *     -> store tx hash in agent_reputation.onchain_proof_hash
 */

export interface ReputationSnapshot {
  agentSlug: string;
  score: number; // 0-100
  alertCount: number;
  proposalCount: number;
  executionCount: number;
  breakdown: Record<string, unknown>; // hashed off-chain
}

export interface AnchorResult {
  ok: true;
  txHash: Hex;
  blockNumber: bigint;
  evidenceHash: Hex;
}

export interface AnchorSkipped {
  ok: false;
  reason: "not-configured" | "no-anchor-key" | "tx-failed" | "timeout";
  message: string;
}

const ANCHOR_TIMEOUT_MS = 25_000;

function sha256Hex(input: string): Hex {
  return `0x${createHash("sha256").update(input).digest("hex")}` as Hex;
}

function slugHash(slug: string): Hex {
  return keccak256(stringToBytes(slug));
}

export async function anchorReputation(
  snapshot: ReputationSnapshot,
): Promise<AnchorResult | AnchorSkipped> {
  if (!contractsConfigured()) {
    return { ok: false, reason: "not-configured", message: "Contracts or anchor key missing." };
  }
  const wallet = getAnchorWalletClient();
  if (!wallet) {
    return { ok: false, reason: "no-anchor-key", message: "Anchor private key not parsable." };
  }

  const reputationAddress = process.env.REPUTATION_CONTRACT as Address;
  const slugHashHex = slugHash(snapshot.agentSlug);
  const evidenceHash = sha256Hex(JSON.stringify(snapshot.breakdown));
  const publicClient = getAnchorPublicClient();

  try {
    const writePromise = wallet.writeContract({
      address: reputationAddress,
      abi: ReputationRegistryAbi,
      functionName: "recordReputation",
      args: [
        slugHashHex,
        clampScore(snapshot.score),
        BigInt(snapshot.alertCount) > 4294967295n ? 4294967295 : snapshot.alertCount,
        BigInt(snapshot.proposalCount) > 4294967295n ? 4294967295 : snapshot.proposalCount,
        BigInt(snapshot.executionCount) > 4294967295n ? 4294967295 : snapshot.executionCount,
        evidenceHash,
      ],
    });

    const txHash = await withTimeout(writePromise, ANCHOR_TIMEOUT_MS);

    const receipt = await withTimeout(
      publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 }),
      ANCHOR_TIMEOUT_MS,
    );

    if (receipt.status !== "success") {
      return { ok: false, reason: "tx-failed", message: `Tx reverted at block ${receipt.blockNumber}` };
    }

    return {
      ok: true,
      txHash,
      blockNumber: receipt.blockNumber,
      evidenceHash,
    };
  } catch (e) {
    const msg = (e as Error).message;
    if (/timed?\s*out/i.test(msg)) {
      return { ok: false, reason: "timeout", message: msg };
    }
    return { ok: false, reason: "tx-failed", message: msg };
  }
}

export async function readOnchainReputation(slug: string) {
  if (!process.env.REPUTATION_CONTRACT) return null;
  try {
    const client = getAnchorPublicClient();
    const result = (await client.readContract({
      address: process.env.REPUTATION_CONTRACT as Address,
      abi: ReputationRegistryAbi,
      functionName: "getReputation",
      args: [slugHash(slug)],
    })) as {
      score: number;
      alertCount: number;
      proposalCount: number;
      executionCount: number;
      timestamp: bigint;
      evidenceHash: Hex;
    };
    if (Number(result.timestamp) === 0) return null;
    return {
      score: Number(result.score),
      alertCount: Number(result.alertCount),
      proposalCount: Number(result.proposalCount),
      executionCount: Number(result.executionCount),
      timestamp: Number(result.timestamp),
      evidenceHash: result.evidenceHash,
      chainName: getActiveChain().name,
    };
  } catch {
    return null;
  }
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`anchor timed out after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

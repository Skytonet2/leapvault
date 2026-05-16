import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAgentBySlug } from "@/lib/services/agents";
import { getDb } from "@/lib/database/client";
import { readOnchainReputation } from "@/lib/contracts/anchor";
import {
  contractsConfigured,
  explorerAddressUrl,
  explorerTxUrl,
  getActiveChain,
} from "@/lib/contracts/network";
import { ok, err, type ServiceResult } from "@/types/common";

export const runtime = "nodejs";

/**
 * Verifiable reputation proof.
 *
 *   GET /api/agents/{slug}/reputation/proof
 *
 * Returns the exact JSON breakdown the anchor service hashed for this agent,
 * plus the recomputed sha256. The caller can compare this against the
 * `evidenceHash` stored on the ReputationRegistry contract (also returned
 * inline) to verify the score on-chain matches what the off-chain database
 * says — without trusting our backend.
 *
 * Hash format is `0x{sha256(JSON.stringify(breakdown))}`, where breakdown
 * keys are emitted in a fixed order (see lib/database/postgres.ts).
 */

interface ProofResponse {
  agent: { slug: string; id: string; score: number | null };
  breakdown: Record<string, number>;
  computed: {
    /** Stringified JSON the server fed into sha256. Reproduce client-side to verify. */
    canonicalJson: string;
    /** sha256(canonicalJson). */
    evidenceHash: string;
  };
  onchain:
    | null
    | {
        score: number;
        alertCount: number;
        proposalCount: number;
        executionCount: number;
        timestamp: number;
        evidenceHash: string;
        chainName: string;
        contractUrl: string;
        txUrl: string | null;
      };
  match: boolean | null;
  instructions: string;
}

export async function GET(
  _req: Request,
  ctx: { params: { slug: string } },
): Promise<NextResponse<ServiceResult<ProofResponse>>> {
  const slug = ctx.params.slug;

  const agentResult = await getAgentBySlug(slug);
  if (!agentResult.ok) {
    return NextResponse.json(agentResult, { status: 404 });
  }
  const agent = agentResult.data;

  const db = getDb();
  if (!db.getAgentReputationSnapshot) {
    return NextResponse.json(
      err("not-configured", "Reputation snapshots are not available in this environment."),
      { status: 503 },
    );
  }

  const snap = await db.getAgentReputationSnapshot(agent.id);
  if (!snap.ok) {
    return NextResponse.json(snap, { status: 500 });
  }

  // CRITICAL: this stringify must match exactly what anchor.ts does, otherwise
  // the recomputed hash won't match the on-chain one. JSON.stringify preserves
  // key insertion order, and the snapshot adapter always builds the breakdown
  // in the same fixed order — see lib/database/postgres.ts.
  const canonicalJson = JSON.stringify(snap.data.breakdown);
  const computedHash =
    "0x" + createHash("sha256").update(canonicalJson).digest("hex");

  let onchain: ProofResponse["onchain"] = null;
  if (contractsConfigured()) {
    const r = await readOnchainReputation(slug);
    if (r) {
      const contractAddr = process.env.REPUTATION_CONTRACT as string;
      onchain = {
        score: r.score,
        alertCount: r.alertCount,
        proposalCount: r.proposalCount,
        executionCount: r.executionCount,
        timestamp: r.timestamp,
        evidenceHash: r.evidenceHash,
        chainName: r.chainName,
        contractUrl: explorerAddressUrl(contractAddr),
        txUrl: agent.reputation.onchainProofHash
          ? explorerTxUrl(agent.reputation.onchainProofHash)
          : null,
      };
    }
  }

  const match =
    onchain === null
      ? null
      : onchain.evidenceHash.toLowerCase() === computedHash.toLowerCase();

  const instructions = [
    "1. Take the `breakdown` object from this response.",
    "2. Stringify it with JSON.stringify (preserve key order — already in canonical form here).",
    "3. Compute sha256 of the resulting UTF-8 bytes.",
    "4. The result must equal `computed.evidenceHash`.",
    `5. The same value is stored on-chain at ReputationRegistry on ${getActiveChain().name} as the evidenceHash field of getReputation(keccak256("${slug}")).`,
  ].join(" ");

  return NextResponse.json(
    ok<ProofResponse>({
      agent: {
        slug: agent.slug,
        id: agent.id,
        score: agent.reputation.score,
      },
      breakdown: snap.data.breakdown,
      computed: {
        canonicalJson,
        evidenceHash: computedHash,
      },
      onchain,
      match,
      instructions,
    }),
  );
}

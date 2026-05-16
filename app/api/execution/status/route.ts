import { NextResponse } from "next/server";
import { evmAddress } from "@/lib/validators/evm";
import {
  getProposal,
  getProposalLogs,
  getProviderStatuses,
} from "@/lib/services/execution";

export const runtime = "nodejs";

/**
 * GET /api/execution/status
 *  - no params           → provider statuses + capabilities + mode
 *  - ?wallet=&proposalId → proposal + logs for the given user
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet");
  const proposalId = url.searchParams.get("proposalId");

  if (wallet && proposalId) {
    const w = evmAddress.safeParse(wallet);
    if (!w.success) {
      return NextResponse.json(
        { ok: false, error: { kind: "validation", message: "Invalid wallet." } },
        { status: 400 },
      );
    }
    const proposal = await getProposal(proposalId, w.data);
    if (!proposal.ok) return NextResponse.json(proposal, { status: 404 });
    const logs = await getProposalLogs(proposalId, w.data);
    return NextResponse.json({
      ok: true,
      data: { proposal: proposal.data, logs: logs.ok ? logs.data : [] },
    });
  }

  const status = await getProviderStatuses();
  return NextResponse.json({ ok: true, data: status });
}

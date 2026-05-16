import { NextResponse } from "next/server";
import { z } from "zod";
import { evmAddress } from "@/lib/validators/evm";
import { approveAndExecuteProposal, rejectProposal } from "@/lib/services/execution";

export const runtime = "nodejs";
// Approve + route + reputation bump + log can chain ~7 DB round-trips on
// a cold serverless start. The default 10s window is too tight.
export const maxDuration = 60;

const approveSchema = z.object({
  wallet: evmAddress,
  proposalId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  highRiskAcknowledged: z.boolean().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = approveSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid approval payload." } },
      { status: 400 },
    );
  }
  if (parsed.data.decision === "reject") {
    const result = await rejectProposal(parsed.data.proposalId, parsed.data.wallet);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  const result = await approveAndExecuteProposal({
    id: parsed.data.proposalId,
    userWallet: parsed.data.wallet,
    highRiskAcknowledged: parsed.data.highRiskAcknowledged,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

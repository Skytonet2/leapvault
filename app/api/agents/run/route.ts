import { NextResponse } from "next/server";
import { z } from "zod";
import { evmAddress } from "@/lib/validators/evm";
import { runAgent } from "@/lib/services/agent-runner";

export const runtime = "nodejs";
// AI calls + RPC reads. Heavy prompts (RWA report) can take 60–80s on the
// NVIDIA cold path; budget for that plus retry overhead.
export const maxDuration = 120;

const bodySchema = z.object({
  wallet: evmAddress,
  agentSlug: z.string().min(1),
  network: z.union([z.literal(5000), z.literal(5003)]).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid run payload." } },
      { status: 400 },
    );
  }
  const result = await runAgent({
    userWallet: parsed.data.wallet,
    agentSlug: parsed.data.agentSlug,
    network: parsed.data.network,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

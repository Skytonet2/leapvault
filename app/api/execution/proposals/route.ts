import { NextResponse } from "next/server";
import { z } from "zod";
import { evmAddress } from "@/lib/validators/evm";
import {
  createProposalFromAlert,
  listUserProposals,
} from "@/lib/services/execution";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet");
  const parsed = evmAddress.safeParse(wallet);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid wallet address." } },
      { status: 400 },
    );
  }
  const result = await listUserProposals(parsed.data);
  return NextResponse.json(result);
}

const ACTION_TYPES = [
  "swap",
  "rebalance",
  "open_lp_position",
  "close_lp_position",
  "claim_rewards",
  "monitor_only",
  "risk_report",
  "custom",
] as const;

const PROVIDERS = ["realclaw", "byreal", "manual", "none"] as const;

const bodySchema = z.object({
  wallet: evmAddress,
  alertId: z.string().min(1),
  actionType: z.enum(ACTION_TYPES).optional(),
  provider: z.enum(PROVIDERS).optional(),
  requestedParams: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { kind: "validation", message: "Invalid proposal payload." },
      },
      { status: 400 },
    );
  }
  const result = await createProposalFromAlert({
    alertId: parsed.data.alertId,
    userWallet: parsed.data.wallet,
    actionType: parsed.data.actionType,
    provider: parsed.data.provider,
    requestedParams: parsed.data.requestedParams,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

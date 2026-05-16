import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateAgentExplanation,
  generateAlertExplanation,
  generateRiskSummary,
  generateRwaAssetReport,
  generateTaskReport,
  generateWalletMovementSummary,
} from "@/lib/ai/prompts";
import { AIProviderError } from "@/lib/ai/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  feature: z.enum([
    "wallet-movement",
    "rwa-report",
    "alert",
    "task-report",
    "risk-summary",
    "agent-explanation",
  ]),
  userWallet: z.string().nullable().optional(),
  payload: z.record(z.unknown()),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid body." } },
      { status: 400 },
    );
  }

  try {
    const ctx = { userWallet: parsed.data.userWallet ?? null };
    let result;
    switch (parsed.data.feature) {
      case "wallet-movement":
        result = await generateWalletMovementSummary(parsed.data.payload as never, ctx);
        break;
      case "rwa-report":
        result = await generateRwaAssetReport(parsed.data.payload as never, ctx);
        break;
      case "alert":
        result = await generateAlertExplanation(parsed.data.payload as never, ctx);
        break;
      case "task-report":
        result = await generateTaskReport(parsed.data.payload as never, ctx);
        break;
      case "risk-summary":
        result = await generateRiskSummary(parsed.data.payload, ctx);
        break;
      case "agent-explanation":
        result = await generateAgentExplanation(parsed.data.payload as never, ctx);
        break;
    }
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    if (e instanceof AIProviderError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind:
              e.error.kind === "not-configured"
                ? "not-configured"
                : e.error.kind === "limit-exceeded"
                  ? "rate-limit"
                  : "upstream",
            message: e.error.message,
          },
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: { kind: "unknown", message: (e as Error).message },
      },
      { status: 500 },
    );
  }
}

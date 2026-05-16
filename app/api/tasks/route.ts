import { NextResponse } from "next/server";
import { z } from "zod";
import { createTask, getUserTasks } from "@/lib/services/tasks";
import { evmAddress } from "@/lib/validators/evm";

export const runtime = "nodejs";

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
  const result = await getUserTasks(parsed.data);
  return NextResponse.json(result);
}

const bodySchema = z.object({
  wallet: evmAddress,
  input: z.unknown(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid request body." } },
      { status: 400 },
    );
  }
  const result = await createTask(parsed.data.wallet, parsed.data.input);
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}

import { NextResponse } from "next/server";
import { getUserAlerts } from "@/lib/services/alerts";
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
  const result = await getUserAlerts(parsed.data, {
    unreadOnly: url.searchParams.get("unread") === "true",
  });
  return NextResponse.json(result);
}

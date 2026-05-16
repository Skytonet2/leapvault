import { NextResponse } from "next/server";
import { evmAddress } from "@/lib/validators/evm";
import { getBindingByWallet } from "@/lib/services/telegram-bindings";
import { botUsername } from "@/lib/services/telegram";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = evmAddress.safeParse(url.searchParams.get("wallet"));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid wallet." } },
      { status: 400 },
    );
  }
  const binding = await getBindingByWallet(parsed.data);
  return NextResponse.json({
    ok: true,
    data: {
      connected: Boolean(binding),
      bot: botUsername(),
      username: binding?.username ?? null,
      firstName: binding?.firstName ?? null,
      since: binding ? new Date(binding.createdAt).toISOString() : null,
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { evmAddress } from "@/lib/validators/evm";
import { getBindingByWallet } from "@/lib/services/telegram-bindings";
import { isTelegramConfigured, sendMessage } from "@/lib/services/telegram";

export const runtime = "nodejs";

const bodySchema = z.object({
  wallet: evmAddress,
  message: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: { kind: "not-configured", message: "Telegram bot not configured." },
      },
      { status: 503 },
    );
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid body." } },
      { status: 400 },
    );
  }
  const binding = await getBindingByWallet(parsed.data.wallet);
  if (!binding) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not-found",
          message: "No Telegram binding for this wallet.",
          hint: "Connect Telegram from the Settings page first.",
        },
      },
      { status: 404 },
    );
  }
  const res = await sendMessage({
    chatId: binding.chatId,
    text: parsed.data.message,
    parseMode: "Markdown",
  });
  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: { kind: "upstream", message: res.description ?? "Telegram error" },
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, data: { delivered: true } });
}

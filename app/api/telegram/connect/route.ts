import { NextResponse } from "next/server";
import { z } from "zod";
import { evmAddress } from "@/lib/validators/evm";
import { createBindingCode } from "@/lib/services/telegram-bindings";
import { botUsername, isTelegramConfigured } from "@/lib/services/telegram";

export const runtime = "nodejs";

const bodySchema = z.object({ wallet: evmAddress });

export async function POST(req: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not-configured",
          message: "Telegram bot is not configured.",
          hint: "Set TELEGRAM_BOT_TOKEN in your environment.",
        },
      },
      { status: 503 },
    );
  }
  const username = botUsername();
  if (!username) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "not-configured",
          message: "TELEGRAM_BOT_USERNAME is not set.",
        },
      },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { kind: "validation", message: "Invalid wallet address." },
      },
      { status: 400 },
    );
  }

  const code = await createBindingCode(parsed.data.wallet);
  if (!code) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          kind: "upstream",
          message:
            "Could not persist a binding code. Telegram bindings require a configured database.",
        },
      },
      { status: 503 },
    );
  }
  const url = `https://t.me/${username}?start=${code}`;
  return NextResponse.json({
    ok: true,
    data: { code, url, bot: username, expiresInMinutes: 15 },
  });
}

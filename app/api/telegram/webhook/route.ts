import { NextResponse } from "next/server";
import { consumeBindingCode, saveBinding } from "@/lib/services/telegram-bindings";
import { sendMessage } from "@/lib/services/telegram";

export const runtime = "nodejs";

/**
 * Telegram webhook receiver.
 *
 * Telegram includes `X-Telegram-Bot-Api-Secret-Token` on every call when the
 * webhook was registered with a secret. We verify that header before doing
 * anything. Missing/wrong secret → 401.
 *
 * Currently handles only one update kind: `/start <code>` → bind the
 * sender's chat to the wallet that generated `<code>`.
 */
export async function POST(req: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== expected) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let body: TelegramUpdate;
  try {
    body = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  const msg = body.message;
  if (!msg || !msg.text || !msg.from) {
    return NextResponse.json({ ok: true });
  }

  const text = msg.text.trim();
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/, 2);
    const code = parts[1];
    if (!code) {
      await sendMessage({
        chatId: msg.chat.id,
        text:
          "Welcome to LeapVault Agent. To connect your wallet, open the app's Settings page and tap *Connect Telegram* — that will return you here with a binding code.",
        parseMode: "Markdown",
      });
      return NextResponse.json({ ok: true });
    }
    const wallet = await consumeBindingCode(code);
    if (!wallet) {
      await sendMessage({
        chatId: msg.chat.id,
        text: "That binding link has expired. Open Settings in the app and tap *Connect Telegram* to generate a fresh one.",
        parseMode: "Markdown",
      });
      return NextResponse.json({ ok: true });
    }
    await saveBinding({
      wallet,
      chatId: msg.chat.id,
      username: msg.from.username,
      firstName: msg.from.first_name,
    });
    await sendMessage({
      chatId: msg.chat.id,
      text: `✅ Connected. Alerts for wallet \`${wallet.slice(0, 6)}…${wallet.slice(-4)}\` will arrive in this chat. This is not financial advice.`,
      parseMode: "Markdown",
    });
    return NextResponse.json({ ok: true });
  }

  // Other text messages — acknowledge but don't process for MVP.
  return NextResponse.json({ ok: true });
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    from?: { id: number; username?: string; first_name: string };
    chat: { id: number; type: string };
  };
}

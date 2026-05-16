import "server-only";

/**
 * Minimal Telegram Bot API client. The full SDK is overkill for a hackathon
 * MVP — we only need `sendMessage`, `getMe`, and `setWebhook`.
 */

export interface TelegramError {
  kind: "not-configured" | "upstream" | "validation";
  message: string;
}

interface TgResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

function getToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function isTelegramConfigured(): boolean {
  return Boolean(getToken());
}

async function call<T>(method: string, body: Record<string, unknown>): Promise<TgResponse<T>> {
  const token = getToken();
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not set." };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return (await res.json()) as TgResponse<T>;
  } catch (e) {
    return { ok: false, description: (e as Error).message };
  }
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export async function getMe(): Promise<TgResponse<TelegramUser>> {
  return call<TelegramUser>("getMe", {});
}

export async function sendMessage(params: {
  chatId: number | string;
  text: string;
  parseMode?: "Markdown" | "HTML";
}): Promise<TgResponse<unknown>> {
  return call("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
    parse_mode: params.parseMode,
    disable_web_page_preview: true,
  });
}

export async function setWebhook(params: {
  url: string;
  secretToken?: string;
}): Promise<TgResponse<true>> {
  return call("setWebhook", {
    url: params.url,
    secret_token: params.secretToken,
    drop_pending_updates: true,
    allowed_updates: ["message"],
  });
}

export async function deleteWebhook(): Promise<TgResponse<true>> {
  return call("deleteWebhook", { drop_pending_updates: false });
}

export function botUsername(): string | null {
  return process.env.TELEGRAM_BOT_USERNAME || null;
}

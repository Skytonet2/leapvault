import "server-only";

import type { Alert } from "@/types/alert";
import { getBindingByWallet } from "@/lib/services/telegram-bindings";
import { isTelegramConfigured, sendMessage } from "@/lib/services/telegram";

/**
 * Push a freshly-created alert to the user's Telegram chat, if they have one
 * bound. Fire-and-forget — callers should `void` the promise and swallow
 * errors. A failed push must not propagate up the agent-run path.
 *
 * Markdown is used for the chat bubble. Telegram's parser handles a small set
 * of tokens; we keep formatting minimal (* for bold, _ for italic, ` for code).
 */

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🚨",
  high: "🔴",
  medium: "🟠",
  low: "🟡",
  info: "🔵",
};

function fmtConfidence(c: string | number | null | undefined): string {
  if (c === null || c === undefined) return "n/a";
  const n = typeof c === "string" ? Number(c) : c;
  if (!Number.isFinite(n)) return "n/a";
  return `${Math.round(n * 100)}%`;
}

function escapeMarkdown(s: string): string {
  // Telegram MarkdownV1 only treats * _ ` [ as control chars. Keep it light.
  return s.replace(/[`*_]/g, "");
}

export async function notifyAlertViaTelegram(
  alert: Alert,
  agentName: string,
): Promise<void> {
  if (!isTelegramConfigured()) return;
  const binding = await getBindingByWallet(alert.userWallet);
  if (!binding) return;

  const emoji = SEVERITY_EMOJI[alert.severity] ?? "🔔";
  const confidence = fmtConfidence(alert.confidence);
  const headline = escapeMarkdown(alert.title);
  const explanation = escapeMarkdown(alert.explanation).slice(0, 500);
  const sourceLine = alert.sourceUrl
    ? `\n[Source](${alert.sourceUrl})`
    : "";

  const text =
    `${emoji} *${headline}*\n` +
    `_${escapeMarkdown(agentName)} · ${alert.severity} · confidence ${confidence}_\n\n` +
    `${explanation}${sourceLine}\n\n` +
    `_This is not financial advice._`;

  await sendMessage({
    chatId: binding.chatId,
    text,
    parseMode: "Markdown",
  });
}

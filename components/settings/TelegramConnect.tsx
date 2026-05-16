"use client";

import * as React from "react";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MeResponse {
  ok: true;
  data: {
    connected: boolean;
    bot: string | null;
    username: string | null;
    firstName: string | null;
    since: string | null;
  };
}

interface ConnectResponse {
  ok: true;
  data: { code: string; url: string; bot: string; expiresInMinutes: number };
}

export function TelegramConnect({ wallet }: { wallet: `0x${string}` | null }) {
  const [me, setMe] = React.useState<MeResponse["data"] | null>(null);
  const [link, setLink] = React.useState<ConnectResponse["data"] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!wallet) return;
    try {
      const r = await fetch(`/api/telegram/me?wallet=${wallet}`, { cache: "no-store" });
      const json = (await r.json()) as MeResponse;
      if (json.ok) setMe(json.data);
    } catch {
      /* swallow */
    }
  }, [wallet]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll for ~3 minutes while a binding link is active, so the UI flips to
  // "Connected" the moment the user finishes /start in Telegram.
  React.useEffect(() => {
    if (!link || me?.connected) return;
    const interval = setInterval(() => {
      refresh();
    }, 3000);
    const stop = setTimeout(() => clearInterval(interval), 1000 * 60 * 3);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [link, me?.connected, refresh]);

  async function connect() {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const json = (await r.json()) as ConnectResponse | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setLink(json.data);
      window.open(json.data.url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    if (!wallet) return;
    setLoading(true);
    try {
      await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          message:
            "🔔 *Test alert from LeapVault Agent*\nYour Telegram channel is wired up correctly. Real alerts will follow once you create monitoring tasks.\n\n_This is not financial advice._",
        }),
      });
    } finally {
      setLoading(false);
    }
  }

  if (!wallet) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2.5">
        <div>
          <div className="text-sm text-text-primary">Telegram</div>
          <div className="text-xs text-text-muted leading-relaxed">
            Connect a wallet first. Telegram alerts are bound per wallet.
          </div>
        </div>
        <Badge variant="muted">Wallet required</Badge>
      </div>
    );
  }

  if (me?.connected) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-signal-ok/30 bg-signal-ok/5 px-3 py-2.5">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <Send className="h-3.5 w-3.5 text-signal-ok" />
            Telegram
            <Badge variant="ok">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </Badge>
          </div>
          <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
            {me.username ? <>@{me.username} · </> : null}
            Alerts will be delivered to your Telegram chat with @{me.bot}.
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="ghost" onClick={sendTest} disabled={loading}>
              Send test alert
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2.5">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Send className="h-3.5 w-3.5" /> Telegram
        </div>
        <div className="text-xs text-text-muted mt-0.5 leading-relaxed">
          Receive explainable alerts in Telegram. We'll open a chat with{" "}
          {me?.bot ? <>@{me.bot}</> : "the bot"}. Tap <strong>Start</strong> there to bind.
        </div>
        {link ? (
          <div className="mt-2 text-xs text-accent-sage">
            Waiting for /start confirmation… link expires in {link.expiresInMinutes} min.
          </div>
        ) : null}
        {error ? <div className="mt-2 text-xs text-signal-risk">{error}</div> : null}
      </div>
      <Button size="sm" onClick={connect} disabled={loading}>
        {link ? (
          <>
            Reopen <ExternalLink className="h-3 w-3" />
          </>
        ) : (
          <>
            Connect <ExternalLink className="h-3 w-3" />
          </>
        )}
      </Button>
    </div>
  );
}

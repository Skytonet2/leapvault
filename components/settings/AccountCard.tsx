"use client";

import * as React from "react";
import { Loader2, LogOut, Mail, Plus, Trash2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/hooks/useSession";
import { shortAddress } from "@/lib/utils/format";

export function AccountCard({
  connectedWallet,
}: {
  connectedWallet: `0x${string}` | null;
}) {
  const session = useSession();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const isWalletLinked = React.useMemo(() => {
    if (!session.user || !connectedWallet) return false;
    return session.user.linkedWallets.includes(connectedWallet.toLowerCase());
  }, [session.user, connectedWallet]);

  async function callLink(wallet: string, action: "link" | "unlink") {
    setBusy(action + ":" + wallet);
    setError(null);
    try {
      const res = await fetch("/api/auth/link-wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, action }),
      });
      const json = (await res.json()) as
        | { ok: true; data: unknown }
        | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
      } else {
        await session.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-accent-sand" /> Account
        </CardTitle>
        <CardDescription>
          Email sign-in lets you use LeapVault on mobile without a wallet. Link wallets later for
          on-chain features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.isLoading ? (
          <div className="text-xs text-text-muted">Loading session…</div>
        ) : session.user ? (
          <>
            <div className="flex items-center justify-between gap-3 surface-card p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-accent-sage shrink-0" />
                <span className="text-sm text-text-primary truncate">{session.user.email}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="ok">Signed in</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setBusy("logout");
                    await session.logout();
                    setBusy(null);
                  }}
                  disabled={busy === "logout"}
                  aria-label="Sign out"
                >
                  {busy === "logout" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">
                Linked wallets
              </div>
              {session.user.linkedWallets.length === 0 ? (
                <p className="text-xs text-text-muted">
                  No wallets linked yet. Connect a wallet from the top bar, then link it below.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {session.user.linkedWallets.map((w) => (
                    <li
                      key={w}
                      className="flex items-center justify-between rounded-md border border-border bg-bg-elevated/40 px-3 py-2"
                    >
                      <span className="font-mono text-xs tnum text-text-primary">
                        {shortAddress(w as `0x${string}`)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => callLink(w, "unlink")}
                        disabled={busy === "unlink:" + w}
                      >
                        {busy === "unlink:" + w ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {connectedWallet && !isWalletLinked ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => callLink(connectedWallet, "link")}
                  disabled={busy === "link:" + connectedWallet}
                >
                  {busy === "link:" + connectedWallet ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Linking
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" /> Link {shortAddress(connectedWallet)} to this account
                    </>
                  )}
                </Button>
              ) : null}
            </div>
            {error ? (
              <div className="text-xs text-signal-risk bg-signal-risk/10 border border-signal-risk/30 rounded-md px-3 py-2">
                {error}
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-muted leading-relaxed">
              Not signed in. Use email sign-in to access LeapVault on any device, including mobile
              browsers that block wallet popups.
            </p>
            <Button asChild>
              <a href="/auth">
                <Mail className="h-4 w-4" /> Sign in with email
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

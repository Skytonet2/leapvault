"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/useSession";

type Stage = "email" | "code";

export default function AuthPage() {
  const router = useRouter();
  const session = useSession();
  const [stage, setStage] = React.useState<Stage>("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [demoCode, setDemoCode] = React.useState<string | null>(null);
  const [demoReason, setDemoReason] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (session.isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [session.isAuthenticated, router]);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setDemoCode(null);
    setDemoReason(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as
        | { ok: true; data: { delivered: boolean; demoCode?: string; reason?: string } }
        | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
      } else {
        if (!json.data.delivered && json.data.demoCode) {
          setDemoCode(json.data.demoCode);
          setDemoReason(json.data.reason ?? null);
          setCode(json.data.demoCode);
        }
        setStage("code");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const json = (await res.json()) as
        | { ok: true; data: unknown }
        | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
      } else {
        await session.refresh();
        router.replace("/dashboard");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-bg-elevated border border-accent-sand/30 grid place-items-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent-sand" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 12 L12 4 L20 12" />
                <path d="M4 12 L12 20 L20 12" opacity="0.6" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold text-text-primary">Sign in to LeapVault</h1>
          <p className="text-sm text-text-muted leading-relaxed">
            {stage === "email"
              ? "Enter your email. We'll send a 6-digit code. You can link a wallet later."
              : `We sent a code to ${email}. Enter it below.`}
          </p>
        </div>

        <div className="surface-elevated p-6">
          {stage === "email" ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-text-muted">
                  Email
                </label>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error ? (
                <div className="text-sm text-signal-risk bg-signal-risk/10 border border-signal-risk/30 rounded-md px-3 py-2">
                  {error}
                </div>
              ) : null}
              <Button type="submit" disabled={submitting || !email} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending code
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" /> Send sign-in code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              {demoCode ? (
                <div className="text-xs leading-relaxed bg-accent-sand/10 border border-accent-sand/30 rounded-md px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="sand">Demo mode</Badge>
                    <span className="text-text-muted">Email server not configured</span>
                  </div>
                  <div className="text-text-primary">
                    Your code is <span className="tnum font-semibold tracking-[0.2em]">{demoCode}</span>
                  </div>
                  {demoReason ? (
                    <div className="text-[10px] text-text-dim mt-1">{demoReason}</div>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-text-muted">
                  6-digit code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                  className="tnum tracking-[0.2em] text-lg text-center"
                  autoFocus
                />
              </div>
              {error ? (
                <div className="text-sm text-signal-risk bg-signal-risk/10 border border-signal-risk/30 rounded-md px-3 py-2">
                  {error}
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={submitting || code.length !== 6} className="w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying
                    </>
                  ) : (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStage("email");
                    setCode("");
                    setError(null);
                  }}
                  className="w-full"
                >
                  Use a different email
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="surface-card p-4 text-xs text-text-muted leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-sage" />
            <span className="text-text-primary">Wallet-optional sign-in</span>
          </div>
          You don't need a wallet to sign in. Email gets you into the marketplace, alerts, and
          proposals. You can link any wallet later in Settings to enable on-chain features.
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-text-muted hover:text-text-primary">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

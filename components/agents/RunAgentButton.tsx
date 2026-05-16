"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Alert } from "@/types/alert";

interface Props {
  agentSlug: string;
  wallet: `0x${string}` | null;
  /** "primary" on the agent profile, "outline" inside an empty state. */
  variant?: "primary" | "outline";
  label?: string;
  onAlertCreated?: (alert: Alert) => void;
}

export function RunAgentButton({
  agentSlug,
  wallet,
  variant = "primary",
  label = "Run agent now",
  onAlertCreated,
}: Props) {
  const queryClient = useQueryClient();
  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function run() {
    if (!wallet) {
      setError("Connect a wallet to run an agent.");
      return;
    }
    setRunning(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wallet, agentSlug }),
      });
      const json = (await res.json()) as
        | { ok: true; data: { alert: Alert } }
        | { ok: false; error: { message: string } };
      if (!json.ok) {
        setError(json.error.message);
      } else {
        setDone(true);
        onAlertCreated?.(json.data.alert);
        queryClient.invalidateQueries({ queryKey: ["alerts", wallet] });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant={variant === "outline" ? "outline" : undefined}
        onClick={run}
        disabled={running || !wallet}
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Running agent…
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4" /> {label}
          </>
        )}
      </Button>
      {!wallet ? (
        <span className="text-[11px] text-text-muted">Connect a wallet to run.</span>
      ) : null}
      {error ? (
        <span className="text-[11px] text-signal-risk">{error}</span>
      ) : null}
      {done ? (
        <span className="text-[11px] text-accent-sage">
          Alert created. Refresh /alerts to see it.
        </span>
      ) : null}
    </div>
  );
}

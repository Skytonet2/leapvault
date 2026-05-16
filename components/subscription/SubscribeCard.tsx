"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { keccak256, parseEther, stringToBytes, type Hex } from "viem";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionRegistryAbi } from "@/lib/contracts/artifacts";
import { mantle, mantleSepolia, explorerLink, getDefaultChain } from "@/lib/chains/mantle";

interface SubscriptionStatusBody {
  ok: true;
  data: {
    configured: boolean;
    chain: string;
    contract: string | null;
    plan: {
      pricePerMonthWei: string;
      pricePerMonth: string;
      recipient: string;
      active: boolean;
    } | null;
    user: { isActive: boolean; expiresAt: number | null } | null;
    agent: { slug: string; id: string };
  };
}

const MONTH_CHOICES = [1, 3, 12] as const;

export function SubscribeCard({ agentSlug, agentName }: { agentSlug: string; agentName: string }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { open } = useAppKit();
  const queryClient = useQueryClient();
  const targetChain = getDefaultChain();
  const wrongChain = isConnected && chainId !== targetChain.id;

  const [months, setMonths] = React.useState<number>(1);
  const { data: writeHash, writeContract, isPending: signing, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: writeHash,
  });

  const subscription = useQuery({
    queryKey: ["subscription", agentSlug, address],
    queryFn: async (): Promise<SubscriptionStatusBody["data"]> => {
      const url = `/api/agents/${agentSlug}/subscription${address ? `?wallet=${address}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as SubscriptionStatusBody;
      return json.data;
    },
    refetchInterval: confirming ? 4_000 : undefined,
  });

  React.useEffect(() => {
    if (confirmed) {
      queryClient.invalidateQueries({ queryKey: ["subscription", agentSlug] });
      const t = setTimeout(() => reset(), 4_000);
      return () => clearTimeout(t);
    }
  }, [confirmed, queryClient, agentSlug, reset]);

  const data = subscription.data;
  if (subscription.isLoading) {
    return <div className="surface-card p-4 h-24 animate-pulse" />;
  }
  if (!data || !data.configured) return null;

  // Free agent (no on-chain plan). Surface this explicitly so users don't
  // wonder why there's no subscribe button.
  if (!data.plan || !data.plan.active) {
    return (
      <div className="surface-card p-4">
        <div className="flex items-center gap-2 text-sm text-text-primary">
          <Badge variant="ok">
            <CheckCircle2 className="h-3 w-3" /> Free agent
          </Badge>
        </div>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          No subscription required. Run this agent for free.
        </p>
      </div>
    );
  }

  const pricePerMonth = data.plan.pricePerMonth;
  const userExpires = data.user?.expiresAt ?? null;
  const userActive = data.user?.isActive ?? false;

  function handleSubscribe() {
    if (!isConnected || !address) {
      open();
      return;
    }
    if (wrongChain) {
      switchChain({ chainId: targetChain.id });
      return;
    }
    const contract = data!.contract as `0x${string}`;
    const slugHash = keccak256(stringToBytes(agentSlug)) as Hex;
    const total = parseEther(pricePerMonth) * BigInt(months);
    writeContract({
      address: contract,
      abi: SubscriptionRegistryAbi,
      functionName: "subscribe",
      args: [slugHash, months],
      value: total,
    });
  }

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-text-muted">
            Subscription · {data.chain}
          </div>
          <div className="mt-1 text-lg font-semibold text-text-primary tnum">
            {pricePerMonth} <span className="text-sm text-text-muted font-normal">MNT/month</span>
          </div>
          <div className="text-[11px] text-text-dim mt-0.5">
            Paid in MNT, 85% to agent owner, 15% marketplace fee.
          </div>
        </div>
        {userActive ? (
          <Badge variant="ok">
            <ShieldCheck className="h-3 w-3" /> Active
          </Badge>
        ) : null}
      </div>

      {userActive && userExpires ? (
        <div className="text-xs text-text-muted">
          Renews / expires{" "}
          <span className="text-text-primary tnum">
            {new Date(userExpires * 1000).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          .
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-muted">Subscribe for</span>
        {MONTH_CHOICES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className={
              "px-2 py-1 rounded-md border transition-colors " +
              (months === m
                ? "border-accent-sand/60 text-accent-sand bg-accent-sand/5"
                : "border-border text-text-muted hover:text-text-primary")
            }
          >
            {m} mo
          </button>
        ))}
        <span className="ml-auto text-text-muted">
          Total <span className="tnum text-text-primary">{(Number(pricePerMonth) * months).toFixed(pricePerMonth.includes(".") ? 4 : 0)} MNT</span>
        </span>
      </div>

      <Button
        size="sm"
        className="w-full"
        disabled={signing || confirming}
        onClick={handleSubscribe}
      >
        {!isConnected ? (
          <>
            <Wallet className="h-4 w-4" /> Connect wallet to subscribe
          </>
        ) : wrongChain ? (
          <>
            <ExternalLink className="h-4 w-4" /> Switch to {targetChain.name}
          </>
        ) : signing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Confirm in wallet
          </>
        ) : confirming ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Waiting for tx
          </>
        ) : userActive ? (
          <>
            <CheckCircle2 className="h-4 w-4" /> Extend subscription
          </>
        ) : (
          <>
            Subscribe — {agentName}
          </>
        )}
      </Button>

      {writeError ? (
        <div className="text-xs text-signal-risk bg-signal-risk/10 border border-signal-risk/30 rounded-md px-3 py-2">
          {writeError.message.split("\n")[0]}
        </div>
      ) : null}

      {confirmed && writeHash ? (
        <a
          href={explorerLink(targetChain.id, "tx", writeHash)}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-accent-sand hover:underline tnum"
        >
          Subscription tx {writeHash.slice(0, 10)}…{writeHash.slice(-6)}
          <ArrowUpRight className="inline h-3 w-3 ml-0.5" />
        </a>
      ) : null}

      {data.contract ? (
        <div className="text-[10px] text-text-dim tnum">
          via{" "}
          <a
            href={explorerLink(targetChain.id, "address", data.contract)}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {data.contract.slice(0, 6)}…{data.contract.slice(-4)}
          </a>
        </div>
      ) : null}
    </div>
  );
}

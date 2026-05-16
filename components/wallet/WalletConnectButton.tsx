"use client";

import * as React from "react";
import { useAccount, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { ChevronDown, Wallet, LogOut, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils/format";
import { isSupportedChainId, mantle, mantleSepolia, supportedChains } from "@/lib/chains/mantle";
import { cn } from "@/lib/utils/cn";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { open } = useAppKit();

  const [chainMenuOpen, setChainMenuOpen] = React.useState(false);
  const chainRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) {
        setChainMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!isConnected || !address) {
    return (
      <Button variant="primary" size="sm" onClick={() => open()}>
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Connect wallet</span>
        <span className="sm:hidden">Connect</span>
      </Button>
    );
  }

  const supported = isSupportedChainId(chainId);
  const chainName =
    chainId === mantle.id
      ? "Mantle"
      : chainId === mantleSepolia.id
        ? "Sepolia"
        : "Wrong net";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="relative hidden sm:block" ref={chainRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setChainMenuOpen((v) => !v)}
          className={cn(!supported && "text-signal-risk border-signal-risk/40")}
        >
          <Network className="h-3.5 w-3.5" />
          {chainName}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
        {chainMenuOpen ? (
          <div className="absolute right-0 mt-2 w-56 surface-elevated p-1 z-50 shadow-elevate">
            {supportedChains.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  switchChain({ chainId: c.id });
                  setChainMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-bg-soft",
                  chainId === c.id ? "text-accent-sand" : "text-text-primary",
                )}
              >
                <span>{c.name}</span>
                {chainId === c.id ? <span className="text-xs">Active</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="px-2 sm:px-3"
        onClick={() => open({ view: "Account" })}
      >
        <span className="h-2 w-2 rounded-full bg-signal-ok inline-block" aria-hidden />
        <span className="tnum text-xs sm:text-sm">{shortAddress(address)}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => disconnect()}
        aria-label="Disconnect"
        className="h-9 w-9"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}

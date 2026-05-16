"use client";

import { useAccount, useChainId } from "wagmi";
import { isSupportedChainId, getDefaultChain } from "@/lib/chains/mantle";

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount();
  const chainId = useChainId();
  const supported = isSupportedChainId(chainId);
  return {
    address: address ?? null,
    isConnected,
    isConnecting: isConnecting || isReconnecting,
    chainId,
    isSupportedNetwork: supported,
    defaultChainId: getDefaultChain().id,
  };
}

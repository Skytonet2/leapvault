import { cookieStorage, createStorage } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { mantle, mantleSepolia } from "@/lib/chains/mantle";

/**
 * Reown AppKit integration.
 *
 * AppKit (built by the WalletConnect team) gives us the universal modal:
 *   - Injected wallets (MetaMask, Rabby, Coinbase, Frame, etc.)
 *   - 600+ mobile wallets via WalletConnect v2 (Trust, Rainbow, Phantom, etc.)
 *   - Email + social login fallback
 *   - QR code pairing for desktop ↔ mobile
 *
 * `createAppKit` itself is called in components/providers.tsx so the modal
 * registers exactly once at module scope (AppKit requirement).
 */

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[wagmi] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Mobile wallets and WalletConnect QR will be unavailable.",
  );
}

export const networks: [AppKitNetwork, ...AppKitNetwork[]] = [mantleSepolia, mantle];

export const metadata = {
  name: "LeapVault Agent",
  description: "AI agents for on-chain alpha and RWA intelligence on Mantle.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://leapvault.xyz",
  icons: ["https://leapvault.xyz/favicon.ico"],
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  networks,
  projectId: projectId ?? "",
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

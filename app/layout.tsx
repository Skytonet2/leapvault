import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "LeapVault Agent. AI agents for on-chain alpha and RWA intelligence",
    template: "%s · LeapVault Agent",
  },
  description:
    "Hire specialized AI agents to monitor smart wallets, RWA yield assets, liquidity changes, and risk signals across Mantle.",
  openGraph: {
    title: "LeapVault Agent",
    description: "AI agents for on-chain alpha and RWA intelligence.",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "LeapVault Agent",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // AppKit hydrates Wagmi state from the cookie set during connection
  // so the connected wallet survives SSR and full page reloads.
  const cookies = headers().get("cookie");

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-bg-page text-text-primary antialiased">
        <Providers cookies={cookies}>{children}</Providers>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { useSession } from "@/hooks/useSession";

export interface TopNavProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  onOpenMobileNav?: () => void;
}

export function TopNav({ title, description, actions, onOpenMobileNav }: TopNavProps) {
  const session = useSession();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg-page/80 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open menu"
          className="lg:hidden h-9 w-9 rounded-md grid place-items-center text-text-muted hover:bg-bg-elevated -ml-1"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          {title ? (
            <h1 className="text-base font-semibold text-text-primary truncate">
              {title}
            </h1>
          ) : null}
          {description ? (
            <p className="text-xs text-text-muted truncate hidden sm:block">{description}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {!session.isAuthenticated && !session.isLoading ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth">
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          ) : null}
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}

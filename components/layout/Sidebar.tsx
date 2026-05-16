"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  Briefcase,
  Building2,
  ClipboardList,
  Compass,
  Home,
  PlusSquare,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/marketplace", label: "Agent Marketplace", icon: Compass },
  { href: "/my-agents", label: "My Agents", icon: Bot },
  { href: "/rwa-monitor", label: "RWA Monitor", icon: Building2 },
  { href: "/alpha-feed", label: "Alpha Feed", icon: Sparkles },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/proposals", label: "Proposals", icon: ClipboardList },
  { href: "/tasks/new", label: "Create Task", icon: PlusSquare },
  { href: "/business", label: "Business", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onMobileClose}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      ) : null}

      <aside
        className={cn(
          "flex w-64 flex-col border-r border-border bg-bg-page/95 backdrop-blur-md",
          "lg:static lg:bg-bg-page/40",
          // Mobile: fixed slide-over
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:transform-none lg:transition-none",
        )}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <Link href="/" className="flex items-center gap-2" onClick={onMobileClose}>
            <Logo />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-text-primary">LeapVault</div>
              <div className="text-[10px] tracking-[0.18em] text-text-muted uppercase">
                Agent
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="lg:hidden h-8 w-8 rounded-md grid place-items-center text-text-muted hover:bg-bg-elevated"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavLinks onClick={onMobileClose} />
        </nav>

        <div className="px-4 py-4 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-ok inline-block" />
            AI provider routing active
          </div>
          <div className="flex items-center gap-2 text-xs text-text-dim">
            <Activity className="h-3 w-3" /> Mantle-native
          </div>
        </div>
      </aside>
    </>
  );
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              active
                ? "bg-bg-elevated text-text-primary"
                : "text-text-muted hover:bg-bg-elevated/60 hover:text-text-primary",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                active ? "text-accent-sand" : "text-text-dim",
              )}
            />
            {label}
          </Link>
        );
      })}
    </>
  );
}

function Logo() {
  return (
    <div className="h-8 w-8 rounded-md bg-bg-elevated border border-accent-sand/30 grid place-items-center">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-sand" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 12 L12 4 L20 12" />
        <path d="M4 12 L12 20 L20 12" opacity="0.6" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

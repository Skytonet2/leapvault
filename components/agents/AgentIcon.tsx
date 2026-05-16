import {
  Activity,
  Building2,
  Coins,
  Droplets,
  Eye,
  ShieldCheck,
  Waves,
} from "lucide-react";
import type { AgentCategory } from "@/types/agent";

const MAP: Record<AgentCategory, React.ComponentType<{ className?: string }>> = {
  "smart-wallet": Eye,
  whale: Waves,
  "rwa-yield": Building2,
  "token-risk": Coins,
  liquidity: Droplets,
  "portfolio-risk": Activity,
  reputation: ShieldCheck,
};

export function AgentIcon({
  category,
  className = "h-5 w-5",
}: {
  category: AgentCategory;
  className?: string;
}) {
  const Icon = MAP[category];
  return <Icon className={className} />;
}

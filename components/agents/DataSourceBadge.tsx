import { Badge } from "@/components/ui/badge";
import { Database, Link as LinkIcon, Wifi, WifiOff } from "lucide-react";

export type DataSourceState = "connected" | "disconnected" | "verification-pending";

export interface DataSourceBadgeProps {
  source: string;
  state: DataSourceState;
}

export function DataSourceBadge({ source, state }: DataSourceBadgeProps) {
  if (state === "connected") {
    return (
      <Badge variant="sage">
        <Wifi className="h-3 w-3" /> {source}
      </Badge>
    );
  }
  if (state === "verification-pending") {
    return (
      <Badge variant="warn">
        <LinkIcon className="h-3 w-3" /> {source} (verifying)
      </Badge>
    );
  }
  return (
    <Badge variant="muted">
      <WifiOff className="h-3 w-3" /> {source} not connected
    </Badge>
  );
}

export function GenericSourceBadge({ source }: { source: string }) {
  return (
    <Badge variant="muted">
      <Database className="h-3 w-3" /> {source}
    </Badge>
  );
}

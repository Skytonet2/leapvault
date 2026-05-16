import { AlertTriangle } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { ServiceError } from "@/types/common";

export function ErrorState({
  error,
  retryHref,
  setupHref,
}: {
  error: ServiceError;
  retryHref?: string;
  setupHref?: string;
}) {
  if (error.kind === "not-configured") {
    return (
      <EmptyState
        variant="setup"
        icon={<AlertTriangle className="h-5 w-5" />}
        title={error.message}
        description={error.hint}
        action={setupHref ? { label: "View setup", href: setupHref } : undefined}
      />
    );
  }
  return (
    <EmptyState
      variant="error"
      icon={<AlertTriangle className="h-5 w-5" />}
      title="Something went wrong"
      description={error.message}
      action={retryHref ? { label: "Retry", href: retryHref } : undefined}
    />
  );
}

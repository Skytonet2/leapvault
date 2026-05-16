import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page-gradient flex items-center justify-center px-6">
      <div className="surface-card p-10 max-w-md text-center space-y-4">
        <div className="text-xs uppercase tracking-[0.18em] text-accent-sand">404</div>
        <h1 className="text-2xl font-semibold text-text-primary">
          That page isn't available
        </h1>
        <p className="text-sm text-text-muted">
          The agent route you were looking for doesn't exist or hasn't been
          configured yet.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/marketplace">Browse agents</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

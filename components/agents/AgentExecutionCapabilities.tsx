"use client";

import { useQuery } from "@tanstack/react-query";
import { Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTION_TYPE_LABEL,
  PROVIDER_LABEL,
  type ExecutionActionType,
  type ExecutionProviderName,
} from "@/lib/execution/types";

interface CapabilityRow {
  agentId: string;
  provider: ExecutionProviderName;
  actionType: ExecutionActionType;
  enabled: boolean;
  requiresApproval: boolean;
}

interface CapabilitiesResponse {
  ok: true;
  data: CapabilityRow[];
}

async function fetchCapabilities(slug: string): Promise<CapabilitiesResponse | { ok: false }> {
  const res = await fetch(`/api/agents/${slug}/capabilities`, { cache: "no-store" });
  if (!res.ok) return { ok: false };
  return (await res.json()) as CapabilitiesResponse;
}

export function AgentExecutionCapabilities({ agentSlug }: { agentSlug: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["agent-capabilities", agentSlug],
    queryFn: () => fetchCapabilities(agentSlug),
  });

  const list = data?.ok ? data.data : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-4 w-4 text-accent-sand" /> Execution Capabilities
        </CardTitle>
        <CardDescription>
          What this agent can propose. Every action requires explicit user approval before any
          provider executes it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : list.length === 0 ? (
          <p className="text-sm text-text-muted">
            This agent is monitoring-only. It surfaces alerts but does not propose executable
            actions.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li
                key={`${c.provider}-${c.actionType}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-elevated/40 px-3 py-2"
              >
                <div>
                  <div className="text-sm text-text-primary">
                    {ACTION_TYPE_LABEL[c.actionType] ?? c.actionType}
                  </div>
                  <div className="text-xs text-text-muted">
                    via {PROVIDER_LABEL[c.provider] ?? c.provider}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.requiresApproval ? <Badge variant="warn">Approval required</Badge> : null}
                  {c.enabled ? <Badge variant="sage">Enabled</Badge> : <Badge variant="muted">Disabled</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-text-muted leading-relaxed">
          Monitoring is autonomous. Execution is approval-based and routed through RealClaw or
          Byreal Skills.
        </p>
      </CardContent>
    </Card>
  );
}

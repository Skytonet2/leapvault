"use client";

import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@/types/agent";
import type { ServiceResult } from "@/types/common";

export interface UseAgentsParams {
  category?: string;
  search?: string;
  sort?: string;
}

async function fetchAgents(params: UseAgentsParams): Promise<ServiceResult<Agent[]>> {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.search) sp.set("q", params.search);
  if (params.sort) sp.set("sort", params.sort);
  const res = await fetch(`/api/agents?${sp.toString()}`, { cache: "no-store" });
  return (await res.json()) as ServiceResult<Agent[]>;
}

export function useAgents(params: UseAgentsParams = {}) {
  return useQuery({
    queryKey: ["agents", params],
    queryFn: () => fetchAgents(params),
  });
}

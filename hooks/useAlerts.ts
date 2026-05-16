"use client";

import { useQuery } from "@tanstack/react-query";
import type { Alert } from "@/types/alert";
import type { ServiceResult } from "@/types/common";

async function fetchAlerts(address: string): Promise<ServiceResult<Alert[]>> {
  const res = await fetch(`/api/alerts?wallet=${address}`, { cache: "no-store" });
  return (await res.json()) as ServiceResult<Alert[]>;
}

export function useUserAlerts(address: string | null) {
  return useQuery({
    queryKey: ["alerts", address],
    queryFn: () => fetchAlerts(address as string),
    enabled: Boolean(address),
  });
}

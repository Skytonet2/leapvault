"use client";

import { useQuery } from "@tanstack/react-query";
import type { RwaAsset } from "@/types/rwa";
import type { ServiceResult } from "@/types/common";

async function fetchRwaAssets(): Promise<ServiceResult<RwaAsset[]>> {
  const res = await fetch("/api/rwa-assets", { cache: "no-store" });
  return (await res.json()) as ServiceResult<RwaAsset[]>;
}

export function useRwaAssets() {
  return useQuery({ queryKey: ["rwa-assets"], queryFn: fetchRwaAssets });
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/task";
import type { ServiceResult } from "@/types/common";
import type { CreateTaskInput } from "@/lib/validators/task";

async function fetchUserTasks(address: string): Promise<ServiceResult<Task[]>> {
  const res = await fetch(`/api/tasks?wallet=${address}`, { cache: "no-store" });
  return (await res.json()) as ServiceResult<Task[]>;
}

export function useUserTasks(address: string | null) {
  return useQuery({
    queryKey: ["tasks", address],
    queryFn: () => fetchUserTasks(address as string),
    enabled: Boolean(address),
  });
}

export function useCreateTask(address: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<ServiceResult<Task>> => {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, input }),
      });
      return (await res.json()) as ServiceResult<Task>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", address] }),
  });
}

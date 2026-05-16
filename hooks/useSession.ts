"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface SessionUser {
  id: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  linkedWallets: string[];
}

interface MeResponse {
  ok: true;
  data: { user: SessionUser | null; expiresAt?: string };
}

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  return (await res.json()) as MeResponse;
}

export function useSession() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    user: data?.data.user ?? null,
    isAuthenticated: Boolean(data?.data.user),
    isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
    logout: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  };
}

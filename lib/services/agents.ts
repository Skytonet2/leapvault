import "server-only";

import type { Agent, AgentCategory } from "@/types/agent";
import type { ServiceResult } from "@/types/common";
import { getDb } from "@/lib/database/client";

export interface AgentListFilters {
  category?: AgentCategory;
  search?: string;
  sort?: "reputation" | "most-used" | "newest" | "price";
}

/**
 * Returns the agent catalog. Backed by the database adapter. Until the adapter
 * is wired (DATABASE_URL unset), this returns `{ kind: "not-configured" }` so
 * the UI can render its admin setup empty state.
 */
export async function getAgents(filters?: AgentListFilters): Promise<ServiceResult<Agent[]>> {
  const db = getDb();
  const result = await db.listAgents({ category: filters?.category });
  if (!result.ok) return result;

  let list = result.data;
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.skills.some((s) => s.label.toLowerCase().includes(q)),
    );
  }
  if (filters?.sort === "reputation") {
    list = [...list].sort(
      (a, b) => (b.reputation.score ?? -1) - (a.reputation.score ?? -1),
    );
  } else if (filters?.sort === "most-used") {
    list = [...list].sort(
      (a, b) => b.reputation.completedTasks - a.reputation.completedTasks,
    );
  } else if (filters?.sort === "newest") {
    list = [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } else if (filters?.sort === "price") {
    list = [...list].sort(
      (a, b) => Number(a.pricing.amount ?? 0) - Number(b.pricing.amount ?? 0),
    );
  }
  return { ok: true, data: list };
}

export async function getAgentBySlug(slug: string): Promise<ServiceResult<Agent>> {
  return getDb().getAgentBySlug(slug);
}

/**
 * Returns agents the user has hired. Joins user_tasks → agents in a real
 * implementation. With no DB this returns a `not-configured` error.
 */
export async function getUserAgents(
  userWallet: `0x${string}`,
): Promise<ServiceResult<Agent[]>> {
  const db = getDb();
  const tasks = await db.listUserTasks(userWallet);
  if (!tasks.ok) return tasks;
  const ids = Array.from(new Set(tasks.data.map((t) => t.agentId)));
  if (ids.length === 0) return { ok: true, data: [] };
  const all = await db.listAgents();
  if (!all.ok) return all;
  return { ok: true, data: all.data.filter((a) => ids.includes(a.id)) };
}

/**
 * Hire-agent stub. Real implementation will record the hire in the DB and
 * optionally call AgentRegistry.registerSubscription on-chain.
 */
export async function hireAgent(_input: {
  userWallet: `0x${string}`;
  agentId: string;
}): Promise<ServiceResult<{ subscriptionId: string }>> {
  return {
    ok: false,
    error: {
      kind: "not-configured",
      message: "Subscription backend is not configured.",
      hint: "Implement /lib/services/agents.ts:hireAgent to persist hires.",
    },
  };
}

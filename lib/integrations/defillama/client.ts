import "server-only";

import type { DefiLlamaPool, DefiLlamaPoolsResponse } from "./types";

const POOLS_URL = "https://yields.llama.fi/pools";

let cache: { at: number; pools: DefiLlamaPool[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

/**
 * Fetch every yield pool from DefiLlama and cache for 5 minutes.
 *
 * The endpoint is public and unauthenticated. We never write user data to it.
 * If the call fails the caller gets an empty list — the UI will surface that
 * as "0 assets" rather than fabricating data.
 */
export async function fetchYieldPools(force = false): Promise<DefiLlamaPool[]> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) {
    return cache.pools;
  }
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(POOLS_URL, {
      signal: ctrl.signal,
      // Server-side fetch — no auth, no cookies.
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(`DefiLlama returned HTTP ${res.status}`);
    }
    const json = (await res.json()) as DefiLlamaPoolsResponse;
    if (json.status !== "success" || !Array.isArray(json.data)) {
      throw new Error("DefiLlama response did not contain a pool list.");
    }
    cache = { at: Date.now(), pools: json.data };
    return json.data;
  } finally {
    clearTimeout(timeout);
  }
}

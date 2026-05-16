export interface DefiLlamaPool {
  /** Pool UUID assigned by DefiLlama. */
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number | null;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  /** "Yield Aggregator" | "RWA" | "Liquid Staking" | "Lending" | ... */
  poolMeta?: string | null;
  category?: string | null;
  /** Underlying token contract addresses (lowercase 0x...). May be empty. */
  underlyingTokens?: string[];
  rewardTokens?: string[];
  /** Stable | Single | LP | etc. */
  stablecoin?: boolean;
  ilRisk?: string;
  exposure?: string;
  /** Project-page URL when available. */
  url?: string | null;
}

export interface DefiLlamaPoolsResponse {
  status: "success" | "error";
  data: DefiLlamaPool[];
}

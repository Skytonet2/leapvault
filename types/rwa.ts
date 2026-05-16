export type RwaCategory =
  | "treasuries"
  | "stable-yield"
  | "real-estate"
  | "credit"
  | "commodities"
  | "liquid-staking";

export interface RwaRiskBreakdown {
  liquidity: number | null;
  issuerTransparency: number | null;
  yieldVolatility: number | null;
  redemption: number | null;
  contract: number | null;
  oracle: number | null;
  marketDepth: number | null;
  abnormalMovement: number | null;
}

export interface RwaAsset {
  id: string;
  name: string;
  symbol: string;
  category: RwaCategory;
  network: number;
  contractAddress: `0x${string}`;
  issuer?: string | null;
  dataSource: string;
  /** APY as decimal e.g. 0.0481 for 4.81%. `null` when adapter not connected. */
  currentApy: number | null;
  /** USD-denominated liquidity, `null` when not available. */
  liquidity: number | null;
  /** 0–100 composite risk. `null` if data is incomplete. */
  riskScore: number | null;
  riskBreakdown: RwaRiskBreakdown;
  lastUpdated: string | null;
  activeMonitoringAgentIds: string[];
}

export const RWA_CATEGORY_LABEL: Record<RwaCategory, string> = {
  treasuries: "Tokenized treasuries",
  "stable-yield": "Yield-bearing stables",
  "real-estate": "Real estate",
  credit: "Credit / invoices",
  commodities: "Commodities",
  "liquid-staking": "Liquid staking",
};

export interface WalletWatch {
  id: string;
  userWallet: `0x${string}`;
  targetWallet: `0x${string}`;
  label?: string | null;
  network: number;
  status: "active" | "paused";
  createdAt: string;
}

export interface AISession {
  userWallet: `0x${string}`;
  network: number;
  provider: string;
  model: string;
}

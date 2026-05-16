/**
 * Deploy AgentRegistry + ReputationRegistry to Mantle Sepolia (or Mantle mainnet).
 *
 *   node --env-file=.env.local scripts/deploy-contracts.mjs
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY     - hex (0x...) hot wallet with Sepolia MNT
 *                              Faucet: https://faucet.sepolia.mantle.xyz
 *   MANTLE_ANCHOR_PRIVATE_KEY OR MANTLE_ANCHOR_ADDRESS
 *                              wallet authorized to call recordReputation.
 *                              In dev you can reuse DEPLOYER_PRIVATE_KEY.
 *   NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL (optional, default public RPC)
 *
 * On success prints contract addresses to paste into Vercel env:
 *   AGENT_REGISTRY_CONTRACT=0x...
 *   REPUTATION_CONTRACT=0x...
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, isAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const TARGET = process.env.DEPLOY_TARGET || "mantle-sepolia";
const chain =
  TARGET === "mantle"
    ? defineChain({
        id: 5000,
        name: "Mantle",
        nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
        rpcUrls: {
          default: { http: [process.env.NEXT_PUBLIC_MANTLE_RPC_URL || "https://rpc.mantle.xyz"] },
        },
        blockExplorers: { default: { name: "Mantle Explorer", url: "https://explorer.mantle.xyz" } },
      })
    : defineChain({
        id: 5003,
        name: "Mantle Sepolia",
        nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
        rpcUrls: {
          default: {
            http: [
              process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz",
            ],
          },
        },
        blockExplorers: {
          default: { name: "Mantle Sepolia Explorer", url: "https://explorer.sepolia.mantle.xyz" },
        },
        testnet: true,
      });

function readArtifact(name) {
  const path = join(ROOT, "contracts", "artifacts", `${name}.json`);
  return JSON.parse(readFileSync(path, "utf8"));
}

function ensure(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
}

function normalizeKey(raw, label) {
  ensure(raw, `Missing env ${label}`);
  const k = raw.startsWith("0x") ? raw : `0x${raw}`;
  ensure(/^0x[0-9a-fA-F]{64}$/.test(k), `${label} must be a 32-byte hex private key`);
  return k;
}

async function main() {
  const deployerKey = normalizeKey(process.env.DEPLOYER_PRIVATE_KEY, "DEPLOYER_PRIVATE_KEY");
  const deployer = privateKeyToAccount(deployerKey);

  let anchorAddress = process.env.MANTLE_ANCHOR_ADDRESS;
  if (!anchorAddress) {
    if (process.env.MANTLE_ANCHOR_PRIVATE_KEY) {
      const ak = normalizeKey(process.env.MANTLE_ANCHOR_PRIVATE_KEY, "MANTLE_ANCHOR_PRIVATE_KEY");
      anchorAddress = privateKeyToAccount(ak).address;
    } else {
      anchorAddress = deployer.address;
      console.log("ℹ no anchor key configured; reusing DEPLOYER as anchor (dev only)");
    }
  }
  ensure(isAddress(anchorAddress), `Anchor address invalid: ${anchorAddress}`);

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ chain, account: deployer, transport: http() });

  const balance = await publicClient.getBalance({ address: deployer.address });
  console.log(`Network:  ${chain.name} (chainId=${chain.id})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${Number(balance) / 1e18} MNT`);
  console.log(`Anchor:   ${anchorAddress}\n`);
  ensure(balance > 0n, "Deployer wallet has zero balance. Top up at https://faucet.sepolia.mantle.xyz");

  const agentArt = readArtifact("AgentRegistry");
  const repArt = readArtifact("ReputationRegistry");

  console.log("▸ Deploying AgentRegistry…");
  const agentTx = await walletClient.deployContract({
    abi: agentArt.abi,
    bytecode: agentArt.bytecode,
    args: [],
  });
  const agentRcpt = await publicClient.waitForTransactionReceipt({ hash: agentTx });
  console.log(`  ✓ AgentRegistry @ ${agentRcpt.contractAddress}`);
  console.log(`    ${chain.blockExplorers.default.url}/tx/${agentTx}\n`);

  console.log("▸ Deploying ReputationRegistry…");
  const repTx = await walletClient.deployContract({
    abi: repArt.abi,
    bytecode: repArt.bytecode,
    args: [anchorAddress],
  });
  const repRcpt = await publicClient.waitForTransactionReceipt({ hash: repTx });
  console.log(`  ✓ ReputationRegistry @ ${repRcpt.contractAddress}`);
  console.log(`    ${chain.blockExplorers.default.url}/tx/${repTx}\n`);

  console.log("─────────────────────────────────────────────────────────");
  console.log("Paste these into Vercel env (production + preview):\n");
  console.log(`  AGENT_REGISTRY_CONTRACT=${agentRcpt.contractAddress}`);
  console.log(`  REPUTATION_CONTRACT=${repRcpt.contractAddress}`);
  console.log(`  MANTLE_ANCHOR_ADDRESS=${anchorAddress}`);
  if (process.env.MANTLE_ANCHOR_PRIVATE_KEY) {
    console.log(`  MANTLE_ANCHOR_PRIVATE_KEY=${process.env.MANTLE_ANCHOR_PRIVATE_KEY}`);
  }
  console.log(`  NEXT_PUBLIC_MANTLE_NETWORK=${TARGET}`);
  console.log("─────────────────────────────────────────────────────────");
}

main().catch((e) => {
  console.error("Deploy failed:", e);
  process.exit(1);
});

/**
 * Deploy SubscriptionRegistry to Mantle Sepolia and set plans for the four
 * priced agents seeded in migrate.mjs.
 *
 *   node --env-file=.env.local scripts/deploy-subscription.mjs
 *
 * Required env:
 *   DEPLOYER_PRIVATE_KEY            32-byte hex with Sepolia MNT
 *   MANTLE_ANCHOR_ADDRESS           treasury address (15% fee recipient)
 *
 * Plans match the off-chain pricing in scripts/migrate.mjs and seed data.
 * Recipient defaults to the deployer (agent owner = us for the demo set).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  isAddress,
  keccak256,
  parseEther,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const TARGET = process.env.DEPLOY_TARGET || "mantle-sepolia";
const chain =
  TARGET === "mantle"
    ? defineChain({
        id: 5000,
        name: "Mantle",
        nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
        rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_MANTLE_RPC_URL || "https://rpc.mantle.xyz"] } },
        blockExplorers: { default: { name: "Mantle Explorer", url: "https://explorer.mantle.xyz" } },
      })
    : defineChain({
        id: 5003,
        name: "Mantle Sepolia",
        nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
        rpcUrls: {
          default: { http: [process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz"] },
        },
        blockExplorers: { default: { name: "Mantle Sepolia Explorer", url: "https://explorer.sepolia.mantle.xyz" } },
        testnet: true,
      });

// Plans match seed-demo pricing. Free agents are omitted (no plan = no gate).
const PLANS = [
  { slug: "whale-alert", pricePerMonth: "5", recipient: null },
  { slug: "rwa-yield-risk", pricePerMonth: "8", recipient: null },
  { slug: "portfolio-risk", pricePerMonth: "12", recipient: null },
  { slug: "token-risk", pricePerMonth: "3", recipient: null }, // converted from per-task
];

const MARKETPLACE_FEE_BPS = 1500; // 15%

function ensure(c, m) {
  if (!c) {
    console.error(`X ${m}`);
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
  const treasury = process.env.MANTLE_ANCHOR_ADDRESS || deployer.address;
  ensure(isAddress(treasury), `Treasury invalid: ${treasury}`);

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ chain, account: deployer, transport: http() });

  const balance = await publicClient.getBalance({ address: deployer.address });
  console.log(`Network:  ${chain.name} (chainId=${chain.id})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${Number(balance) / 1e18} MNT`);
  console.log(`Treasury: ${treasury}`);
  console.log(`Fee BPS:  ${MARKETPLACE_FEE_BPS} (${MARKETPLACE_FEE_BPS / 100}%)\n`);
  ensure(balance > 0n, "Deployer has zero balance");

  const artifact = JSON.parse(
    readFileSync(join(ROOT, "contracts", "artifacts", "SubscriptionRegistry.json"), "utf8"),
  );

  console.log("Deploying SubscriptionRegistry...");
  const txHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [treasury, MARKETPLACE_FEE_BPS],
  });
  const rcpt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const contractAddr = rcpt.contractAddress;
  console.log(`  OK SubscriptionRegistry @ ${contractAddr}`);
  console.log(`     ${chain.blockExplorers.default.url}/tx/${txHash}\n`);

  console.log("Setting plans...");
  for (const plan of PLANS) {
    const slugHash = keccak256(stringToBytes(plan.slug));
    const recipient = plan.recipient || deployer.address;
    const wei = parseEther(plan.pricePerMonth);
    try {
      const tx = await walletClient.writeContract({
        address: contractAddr,
        abi: artifact.abi,
        functionName: "setPlan",
        args: [slugHash, wei, recipient],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log(`  OK ${plan.slug.padEnd(20)} ${plan.pricePerMonth} MNT/mo  -> ${recipient}`);
      console.log(`     tx: ${chain.blockExplorers.default.url}/tx/${tx}`);
    } catch (e) {
      console.log(`  X  ${plan.slug}: ${e.shortMessage || e.message}`);
    }
  }

  console.log("\n----------------------------------------------------------");
  console.log("Paste into Vercel env (production + preview + development):\n");
  console.log(`  SUBSCRIPTION_CONTRACT=${contractAddr}`);
  console.log(`  NEXT_PUBLIC_SUBSCRIPTION_CONTRACT=${contractAddr}`);
  console.log("----------------------------------------------------------");
}

main().catch((e) => {
  console.error("Deploy failed:", e);
  process.exit(1);
});

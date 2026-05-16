/**
 * Register the 7 seeded agents in the on-chain AgentRegistry.
 *
 *   node --env-file=.env.local scripts/register-agents.mjs
 *
 * Required env (in addition to DEPLOYER_PRIVATE_KEY):
 *   AGENT_REGISTRY_CONTRACT   - deployed via scripts/deploy-contracts.mjs
 *   NEXT_PUBLIC_APP_URL       - used to build the metadata URI
 *
 * Each call emits an AgentRegistered event. Judges can verify the registry
 * directly on the Mantle Sepolia explorer.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  stringToBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");

const SLUGS = [
  "smart-wallet-tracker",
  "rwa-yield-risk",
  "reputation",
  "portfolio-risk",
  "liquidity-flow",
  "token-risk",
  "whale-alert",
];

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
          default: {
            http: [process.env.NEXT_PUBLIC_MANTLE_SEPOLIA_RPC_URL || "https://rpc.sepolia.mantle.xyz"],
          },
        },
        blockExplorers: {
          default: { name: "Mantle Sepolia Explorer", url: "https://explorer.sepolia.mantle.xyz" },
        },
        testnet: true,
      });

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
  ensure(process.env.AGENT_REGISTRY_CONTRACT, "AGENT_REGISTRY_CONTRACT not set");
  const deployerKey = normalizeKey(process.env.DEPLOYER_PRIVATE_KEY, "DEPLOYER_PRIVATE_KEY");
  const deployer = privateKeyToAccount(deployerKey);

  const artifact = JSON.parse(
    readFileSync(join(ROOT, "contracts", "artifacts", "AgentRegistry.json"), "utf8"),
  );

  const publicClient = createPublicClient({ chain, transport: http() });
  const walletClient = createWalletClient({ chain, account: deployer, transport: http() });

  const registry = process.env.AGENT_REGISTRY_CONTRACT;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leapvault.xyz";

  console.log(`Registering ${SLUGS.length} agents on ${chain.name}`);
  console.log(`Registry: ${registry}`);
  console.log(`Deployer: ${deployer.address}\n`);

  for (const slug of SLUGS) {
    const slugHash = keccak256(stringToBytes(slug));
    const metadataURI = `${baseUrl}/api/agents/${slug}`;

    try {
      const already = await publicClient.readContract({
        address: registry,
        abi: artifact.abi,
        functionName: "isRegistered",
        args: [slugHash],
      });
      if (already) {
        console.log(`  ↷ ${slug} (already registered)`);
        continue;
      }
    } catch (e) {
      console.log(`  ⚠ ${slug} pre-check failed: ${e.message}`);
    }

    try {
      const tx = await walletClient.writeContract({
        address: registry,
        abi: artifact.abi,
        functionName: "registerAgent",
        args: [slugHash, deployer.address, metadataURI],
      });
      const rcpt = await publicClient.waitForTransactionReceipt({ hash: tx });
      console.log(`  ✓ ${slug}`);
      console.log(`    tx: ${chain.blockExplorers.default.url}/tx/${tx}`);
      console.log(`    block: ${rcpt.blockNumber}`);
    } catch (e) {
      console.log(`  ✗ ${slug}: ${e.shortMessage || e.message}`);
    }
  }

  const count = await publicClient.readContract({
    address: registry,
    abi: artifact.abi,
    functionName: "agentCount",
  });
  console.log(`\nOn-chain agent count: ${count}`);
}

main().catch((e) => {
  console.error("Registration failed:", e);
  process.exit(1);
});

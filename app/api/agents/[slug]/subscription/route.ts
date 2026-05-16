import { NextResponse } from "next/server";
import type { Address } from "viem";
import { isAddress } from "viem";
import { getAgentBySlug } from "@/lib/services/agents";
import {
  getActiveChainName,
  getExpiresAt,
  getPlan,
  getSubscriptionContractAddress,
  isSubscribed,
  subscriptionsConfigured,
} from "@/lib/contracts/subscriptions";
import { ok, type ServiceResult } from "@/types/common";

export const runtime = "nodejs";

/**
 * GET /api/agents/{slug}/subscription?wallet=0x...
 *
 * Returns the agent's on-chain Plan plus the caller's subscription state.
 * Public — anyone can read prices. The wallet param is optional (omit to
 * just fetch the plan).
 */

interface SubscriptionStatus {
  configured: boolean;
  chain: string;
  contract: string | null;
  plan: {
    pricePerMonthWei: string;
    pricePerMonth: string; // human-readable
    recipient: string;
    active: boolean;
  } | null;
  user: {
    isActive: boolean;
    expiresAt: number | null;
  } | null;
  agent: { slug: string; id: string };
}

function formatMnt(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export async function GET(
  req: Request,
  ctx: { params: { slug: string } },
): Promise<NextResponse<ServiceResult<SubscriptionStatus>>> {
  const slug = ctx.params.slug;

  const agent = await getAgentBySlug(slug);
  if (!agent.ok) {
    return NextResponse.json(agent, { status: 404 });
  }

  const url = new URL(req.url);
  const walletParam = url.searchParams.get("wallet");
  const wallet = walletParam && isAddress(walletParam) ? (walletParam as Address) : null;

  const configured = subscriptionsConfigured();
  const contract = getSubscriptionContractAddress();

  let plan: SubscriptionStatus["plan"] = null;
  let user: SubscriptionStatus["user"] = null;

  if (configured) {
    const p = await getPlan(slug);
    if (p) {
      plan = {
        pricePerMonthWei: p.pricePerMonth.toString(),
        pricePerMonth: formatMnt(p.pricePerMonth),
        recipient: p.recipient,
        active: p.active,
      };
    }
    if (wallet) {
      const [active, expiry] = await Promise.all([
        isSubscribed(slug, wallet),
        getExpiresAt(slug, wallet),
      ]);
      user = { isActive: active, expiresAt: expiry };
    }
  }

  return NextResponse.json(
    ok<SubscriptionStatus>({
      configured,
      chain: getActiveChainName(),
      contract,
      plan,
      user,
      agent: { slug: agent.data.slug, id: agent.data.id },
    }),
  );
}

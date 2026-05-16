import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/ai/provider";
import { getRecentUsage } from "@/lib/ai/cost-control";

export const runtime = "nodejs";

export async function GET() {
  const statuses = getProviderStatuses();
  const recentUsage = getRecentUsage(10).map((r) => ({
    feature: r.feature,
    provider: r.provider,
    model: r.model,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
  return NextResponse.json({
    ok: true,
    data: {
      providers: statuses,
      recentUsage,
      cacheEnabled: process.env.AI_ENABLE_CACHE !== "false",
      dailyLimit: Number(process.env.AI_DAILY_USER_LIMIT ?? 100),
    },
  });
}

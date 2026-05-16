import { NextResponse } from "next/server";
import { getAgents } from "@/lib/services/agents";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const result = await getAgents({
    category: (url.searchParams.get("category") || undefined) as never,
    search: url.searchParams.get("q") || undefined,
    sort: (url.searchParams.get("sort") || undefined) as never,
  });
  return NextResponse.json(result);
}

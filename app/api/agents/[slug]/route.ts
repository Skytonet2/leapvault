import { NextResponse } from "next/server";
import { getAgentBySlug } from "@/lib/services/agents";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  const result = await getAgentBySlug(ctx.params.slug);
  return NextResponse.json(result);
}

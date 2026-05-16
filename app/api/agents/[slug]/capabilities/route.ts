import { NextResponse } from "next/server";
import { getAgentBySlug } from "@/lib/services/agents";
import { getAgentCapabilities } from "@/lib/services/execution";

export const runtime = "nodejs";

/**
 * GET /api/agents/[slug]/capabilities
 *
 * `slug` is what the rest of the agent API uses. We resolve it to an agent id,
 * then look up capabilities by id. If the database is not configured we still
 * return a clean structured response so the UI shows the empty state.
 */
export async function GET(_req: Request, ctx: { params: { slug: string } }) {
  const agent = await getAgentBySlug(ctx.params.slug);
  if (!agent.ok) return NextResponse.json(agent, { status: 404 });

  const caps = await getAgentCapabilities(agent.data.id);
  return NextResponse.json(caps);
}

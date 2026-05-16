import { NextResponse } from "next/server";
import { z } from "zod";
import { requestCode } from "@/lib/services/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { kind: "validation", message: "Invalid email." } },
      { status: 400 },
    );
  }
  const result = await requestCode(parsed.data.email);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

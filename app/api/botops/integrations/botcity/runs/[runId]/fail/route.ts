import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { failRun } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const failRunSchema = z.object({
  failureReason: z.string(),
  errorCode: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    // 1. Enforce HMAC Auth with raw request body (Correction #3)
    const auth = await verifyIngestAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 2. Parse from verified rawBody buffer
    const json = JSON.parse(auth.rawBody.toString("utf8"));
    const parsed = failRunSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    // 3. Call shared service
    const run = await failRun(runId, body);

    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

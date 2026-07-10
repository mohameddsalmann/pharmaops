import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { completeRun } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const completeRunSchema = z.object({
  finalOutcome: z.string(),
  status: z.enum(["completed", "stalled", "needs_human_review"]).optional(),
  processedItemCount: z.number().optional(),
  externalTaskStatus: z.string().optional(),
  completionClientId: z.string().optional(),
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
    const parsed = completeRunSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    // 3. Call shared service
    const run = await completeRun(runId, body);

    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

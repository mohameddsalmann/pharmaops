import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { completeRun } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const completeRunSchema = z.object({
  finalOutcome: z.string(),
  status: z.enum(["completed", "stalled", "needs_human_review"]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    const auth = await verifyIngestAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const json = JSON.parse(auth.rawBody.toString("utf8"));
    const parsed = completeRunSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    const run = await completeRun(runId, {
      finalOutcome: body.finalOutcome,
      status: body.status,
    });

    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

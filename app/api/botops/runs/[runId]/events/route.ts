import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { ingestEvent } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const eventIngestSchema = z.object({
  clientEventId: z.string().optional(),
  stepNumber: z.number(),
  screenName: z.string(),
  actionType: z.enum([
    "screen_read",
    "field_extract",
    "field_entry",
    "click",
    "navigation",
    "validation",
    "exception",
    "human_handoff",
  ]),
  actionSummary: z.string(),
  confidence: z.number(),
  durationMs: z.number(),
  status: z.enum(["success", "warning", "failed"]),
  extractedFields: z.record(z.unknown()).optional(),
  enteredFields: z.record(z.unknown()).optional(),
  screenText: z.string().optional(),
  domSnapshot: z.record(z.unknown()).optional(),
  uiFingerprint: z.string().optional(),
  beforeStateHash: z.string().optional(),
  afterStateHash: z.string().optional(),
  expectedNextAction: z.string().optional(),
  actualNextAction: z.string().optional(),
  sequenceNumber: z.number().optional(),
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
    const parsed = eventIngestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    const { event, idempotent } = await ingestEvent(runId, body);

    return NextResponse.json({ event, idempotent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

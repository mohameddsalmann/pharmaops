import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { ingestEvent } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const eventIngestSchema = z.object({
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
  clientEventId: z.string().optional(),
  extractedFields: z.record(z.unknown()).optional(),
  enteredFields: z.record(z.unknown()).optional(),
  screenText: z.string().optional(),
  domSnapshot: z.record(z.unknown()).optional(),
  uiFingerprint: z.string().optional(),
  beforeStateHash: z.string().optional(),
  afterStateHash: z.string().optional(),
  expectedNextAction: z.string().optional(),
  actualNextAction: z.string().optional(),
  sequenceNumber: z.number().optional(), // Telemetry sequencing field
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
    const parsed = eventIngestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    // 3. Call shared service
    const { event, idempotent } = await ingestEvent(runId, body);

    return NextResponse.json({ event, idempotent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { verifyIngestAuth } from "@/lib/botops/middleware";
import { startRun } from "@/lib/botops/ingestion-services";
import { z } from "zod";

const startRunSchema = z.object({
  pharmacyId: z.string(),
  pharmacyName: z.string(),
  pmsType: z.enum(["pioneer", "rx30", "liberty", "primerx", "lifefile", "pk_software", "generic"]),
  workflowType: z.enum([
    "prescription_intake",
    "data_entry",
    "refill_processing",
    "prior_authorization",
    "benefit_investigation",
    "patient_communication",
  ]),
  botVersion: z.string(),
  environment: z.enum(["demo", "staging", "production_redacted"]),
  expectedFields: z.record(z.string()).optional(),
  baselineVersion: z.string().nullable().optional(),
  scenarioId: z.string().nullable().optional(),
  externalTaskId: z.string().optional(),
  automationLabel: z.string().optional(),
  runnerId: z.string().optional(),
  workflowSpecVersion: z.string().min(1), // Required for external integrations — no silent default
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce HMAC Auth with raw request body (Correction #3)
    const auth = await verifyIngestAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 2. Parse from verified rawBody buffer
    const json = JSON.parse(auth.rawBody.toString("utf8"));
    const parsed = startRunSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const body = parsed.data;

    // 3. Call shared service
    const run = await startRun({
      pharmacyId: body.pharmacyId,
      pharmacyName: body.pharmacyName,
      pmsType: body.pmsType,
      workflowType: body.workflowType,
      botVersion: body.botVersion,
      environment: body.environment,
      expectedFields: body.expectedFields,
      baselineVersion: body.baselineVersion,
      scenarioId: body.scenarioId,
      externalTaskId: body.externalTaskId,
      automationLabel: body.automationLabel,
      runnerId: body.runnerId,
      workflowSpecVersion: body.workflowSpecVersion,
    });

    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

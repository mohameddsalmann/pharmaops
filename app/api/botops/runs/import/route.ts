import { NextRequest, NextResponse } from "next/server";
import { requireQaEngineer, guardResponse } from "@/lib/auth/route-guard";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { botRunImportSchema } from "@/lib/schemas/bot-run";
import { evaluateBotRun } from "@/lib/botops/evaluate";
import { createSummaryRecord } from "@/lib/botops/summarize";
import { generateId, nowISO } from "@/lib/utils/id";
import { BOT_RUN_SCHEMA_VERSION, EVENT_SCHEMA_VERSION } from "@/lib/botops/versions";
import type { BotRun, BotRunEvent } from "@/lib/schemas/bot-run";

export async function POST(req: NextRequest) {
  const guard = await requireQaEngineer(req);
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const body = await req.json();
    const parsed = botRunImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid import data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const store = await getSeededBotOpsStore();

    const runId = generateId();
    const runNumber = data.runNumber;

    const run: BotRun = {
      id: runId,
      runNumber,
      pharmacyId: data.pharmacyId,
      pharmacyName: data.pharmacyName,
      pmsType: data.pmsType,
      workflowType: data.workflowType,
      botVersion: data.botVersion,
      environment: data.environment,
      startedAt: data.events[0]?.timestamp ?? nowISO(),
      completedAt: data.events[data.events.length - 1]?.timestamp ?? null,
      status: "completed",
      finalOutcome: "Imported run — pending evaluation.",
      containsPhi: false,
      phiRedacted: true,
      safeForReview: true,
      redactionFindings: [],
      overallScore: null,
      riskLevel: null,
      decision: null,
      mainFinding: null,
      recommendedAction: null,
      baselineVersion: data.baselineVersion ?? null,
      scenarioId: null,
      expectedFields: data.expectedFields ?? {},
      botRunSchemaVersion: BOT_RUN_SCHEMA_VERSION,
      releaseReadinessScore: null,
      mainRisk: null,
      recommendedEngineeringAction: null,
      recommendedQaAction: null,
      workflowSpecVersion: data.workflowSpecVersion ?? "1.0.0",
      workflowSpecId: null,
      workflowSpecHash: null,
      executionStatus: "completed",
      evaluationStatus: "pending",
      completionClientId: null,
    };

    const events: BotRunEvent[] = data.events.map((e) => ({
      ...e,
      id: generateId(),
      botRunId: runId,
      eventSchemaVersion: EVENT_SCHEMA_VERSION,
    }));

    await store.createRun({ run, events });
    await store.addAuditLog({
      botRunId: runId,
      actorType: "import",
      actorName: "api",
      action: "run_imported",
      details: { runNumber, eventCount: events.length },
    });

    const baseline = await store.getBaseline(
      run.workflowType,
      run.baselineVersion ?? run.botVersion
    );

    const result = await evaluateBotRun(
      run,
      events,
      data.expectedFields,
      data.enteredFields,
      baseline,
      { useLlm: false }
    );

    await store.updateRun(result.run);
    await store.setEvaluatorResults(runId, result.evaluatorResults);
    await store.setFieldComparisons(runId, result.fieldComparisons);
    await store.setSummary(
      createSummaryRecord(runId, {
        summary: result.summary,
        reviewerNote: result.reviewerNote,
        engineeringExplanation: result.engineeringExplanation,
        usedLlm: result.usedLlm,
      })
    );
    await store.addAuditLog({
      botRunId: runId,
      actorType: "evaluator",
      actorName: "evaluate_orchestrator",
      action: "run_evaluated",
      details: {
        overallScore: result.overallScore,
        decision: result.decision,
        usedLlm: result.usedLlm,
      },
    });

    return NextResponse.json({
      run: result.run,
      evaluatorResults: result.evaluatorResults,
      fieldComparisons: result.fieldComparisons,
      summary: result.summary,
      usedLlm: result.usedLlm,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    schema: {
      type: "object",
      required: ["runNumber", "pharmacyId", "pharmacyName", "pmsType", "workflowType", "botVersion", "events"],
      properties: {
        runNumber: { type: "string" },
        pharmacyId: { type: "string" },
        pharmacyName: { type: "string" },
        pmsType: { type: "string", enum: ["pioneer", "rx30", "liberty", "primerx", "lifefile", "pk_software", "generic"] },
        workflowType: { type: "string", enum: ["prescription_intake", "data_entry", "refill_processing", "prior_authorization", "benefit_investigation", "patient_communication"] },
        botVersion: { type: "string" },
        environment: { type: "string", enum: ["demo", "staging", "production_redacted"] },
        baselineVersion: { type: "string" },
        events: { type: "array" },
        expectedFields: { type: "object" },
        enteredFields: { type: "object" },
      },
    },
    example: {
      runNumber: "BR-IMPORT-001",
      pharmacyId: "pharm-001",
      pharmacyName: "Demo Pharmacy",
      pmsType: "pioneer",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "demo",
      baselineVersion: "1.2.0",
      events: [
        {
          stepNumber: 1,
          timestamp: new Date().toISOString(),
          screenName: "Patient Search",
          actionType: "screen_read",
          actionSummary: "Read patient search screen",
          confidence: 0.95,
          durationMs: 1200,
          status: "success",
        },
      ],
      expectedFields: { medicationName: "Lisinopril", strength: "10mg" },
      enteredFields: { medicationName: "Lisinopril", strength: "10mg" },
    },
  });
}

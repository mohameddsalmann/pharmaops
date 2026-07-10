import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getBotOpsStore } from "@/lib/db/botops-index";
import { evaluateBotRun } from "@/lib/botops/evaluate";
import { createSummaryRecord } from "@/lib/botops/summarize";
import { deriveEnteredFieldsFromEvents } from "@/lib/botops/event-aggregation";
import {
  isSandboxEnabled,
  isSandboxConfigured,
  validateSandboxOrigin,
  validateDemoToken,
  getDemoTokenFromRequest,
  checkSandboxRateLimit,
  checkContentType,
  checkPayloadSize,
  getClientIp,
  SANDBOX_MAX_PAYLOAD_BYTES,
} from "@/lib/botops/sandbox-session";

const evaluateSchema = z.object({
  useLlm: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!isSandboxEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSandboxConfigured()) {
    return NextResponse.json(
      { error: "Sandbox is not properly configured" },
      { status: 503 }
    );
  }

  if (!validateSandboxOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed" }, { status: 403 });
  }

  const token = getDemoTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Missing demo token" }, { status: 401 });
  }

  const session = validateDemoToken(token);
  if (!session) {
    return NextResponse.json({ error: "Invalid or expired demo token" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateOk = await checkSandboxRateLimit(session.sessionId, ip);
  if (!rateOk) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (!checkContentType(req)) {
    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
  }

  let rawBody: Buffer;
  try {
    const arrayBuffer = await req.arrayBuffer();
    rawBody = Buffer.from(arrayBuffer);
  } catch {
    return NextResponse.json({ error: "Unable to read request body" }, { status: 400 });
  }

  if (!checkPayloadSize(rawBody, SANDBOX_MAX_PAYLOAD_BYTES)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const parsed = evaluateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    const store = await getBotOpsStore();
    const detail = await store.getRunDetail(runId);
    if (!detail) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    await store.updateRun({ ...detail, status: "evaluating" });

    const expectedFields = detail.expectedFields ?? {};
    const enteredFields = deriveEnteredFieldsFromEvents(detail.events);

    const result = await evaluateBotRun(
      detail,
      detail.events,
      expectedFields,
      enteredFields,
      detail.baseline,
      { useLlm: parsed.data.useLlm ?? false }
    );

    const finalStatus =
      result.decision === "stop_automation"
        ? "failed" as const
        : result.decision === "needs_qa_review"
          ? "needs_human_review" as const
          : "evaluated" as const;

    const finalRun = { ...result.run, status: finalStatus };
    await store.updateRun(finalRun);
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
        derivedEnteredFields: Object.keys(enteredFields),
      },
    });

    return NextResponse.json({
      run: finalRun,
      evaluatorResults: result.evaluatorResults,
      fieldComparisons: result.fieldComparisons,
      summary: result.summary,
      reviewerNote: result.reviewerNote,
      engineeringExplanation: result.engineeringExplanation,
      usedLlm: result.usedLlm,
      derivedEnteredFields: enteredFields,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

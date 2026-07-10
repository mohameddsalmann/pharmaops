import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startRun } from "@/lib/botops/ingestion-services";
import { getScenarioById } from "@/lib/botops/pms-sandbox/scenarios";
import {
  isSandboxEnabled,
  isSandboxConfigured,
  validateSandboxOrigin,
  validateDemoToken,
  getDemoTokenFromRequest,
  checkSandboxRateLimit,
  checkContentType,
  checkPayloadSize,
  incrementRunCount,
  getClientIp,
  SANDBOX_MAX_PAYLOAD_BYTES,
} from "@/lib/botops/sandbox-session";

const startRunSchema = z.object({
  scenarioId: z.string().min(1),
});

export async function POST(req: NextRequest) {
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

  const parsed = startRunSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { scenarioId } = parsed.data;
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 400 });
  }

  const runAllowed = await incrementRunCount(session.sessionId, session.maxRuns);
  if (!runAllowed) {
    return NextResponse.json({ error: "Maximum runs per session exceeded" }, { status: 429 });
  }

  try {
    const run = await startRun({
      pharmacyId: scenario.pharmacyId,
      pharmacyName: scenario.pharmacyName,
      pmsType: scenario.pmsType,
      workflowType: scenario.workflowType,
      botVersion: scenario.botVersion,
      environment: "demo",
      expectedFields: scenario.expectedFields,
      baselineVersion: undefined,
      scenarioId: scenario.id,
      workflowSpecVersion: scenario.workflowSpecVersion,
    });

    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeRun } from "@/lib/botops/ingestion-services";
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

const completeRunSchema = z.object({
  finalOutcome: z.string(),
  status: z.enum(["completed", "stalled", "needs_human_review"]).optional(),
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

  const parsed = completeRunSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    const run = await completeRun(runId, {
      finalOutcome: parsed.data.finalOutcome,
      status: parsed.data.status,
    });
    return NextResponse.json({ run });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

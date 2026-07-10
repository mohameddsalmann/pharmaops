import { NextRequest, NextResponse } from "next/server";
import {
  isSandboxEnabled,
  isSandboxConfigured,
  createDemoSession,
  validateSandboxOrigin,
  checkSessionIssuanceRateLimit,
  getClientIp,
} from "@/lib/botops/sandbox-session";

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

  const ip = getClientIp(req);
  const rateOk = await checkSessionIssuanceRateLimit(ip);
  if (!rateOk) {
    return NextResponse.json({ error: "Rate limit exceeded for session issuance" }, { status: 429 });
  }

  const result = createDemoSession();
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    token: result.token,
    sessionId: result.sessionId,
    expiresAt: result.expiresAt,
  });
}

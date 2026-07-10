import { NextRequest, NextResponse } from "next/server";

/**
 * This route has been removed from the public API.
 * Evaluation is now triggered server-side after run completion
 * by calling evaluateBotRun directly from the ingestion service.
 *
 * The browser must never call HMAC-protected routes directly.
 * Use the sandbox evaluate route for demo/sandbox evaluation.
 */
export async function POST(
  _req: NextRequest,
  _ctx: { params: Promise<{ runId: string }> }
) {
  return NextResponse.json(
    { error: "This route is no longer publicly accessible. Evaluation is triggered server-side after run completion." },
    { status: 404 }
  );
}

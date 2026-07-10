import { NextRequest, NextResponse } from "next/server";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";

export async function GET(req: NextRequest) {
  try {
    const store = await getSeededBotOpsStore();
    const params = req.nextUrl.searchParams;
    const runId = params.get("runId") ?? undefined;
    const logs = await store.getAuditLogs(runId);
    return NextResponse.json({ logs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

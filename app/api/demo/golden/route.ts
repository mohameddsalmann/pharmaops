import { NextResponse } from "next/server";
import { requireDevOnly, guardResponse } from "@/lib/auth/route-guard";
import { getStore } from "@/lib/db";
import { runQAPipeline } from "@/lib/agents/orchestrator";

export async function POST() {
  const guard = requireDevOnly();
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const store = getStore();

    await store.resetDemoData();
    await store.seedDemoData();

    const cases = await store.listCases({});
    let approvedCount = 0;
    let riskyStoppedCount = 0;
    let priorAuthRoutedCount = 0;

    for (const c of cases) {
      if (c.status === "pending_qa") {
        await runQAPipeline(store, c.id);
      }
    }

    const updatedCases = await store.listCases({});
    for (const c of updatedCases) {
      if (c.status === "approved") approvedCount++;
      if (c.status === "needs_human_review" || c.status === "missing_information" || c.status === "rejected") {
        riskyStoppedCount++;
      }
      if (c.status === "prior_authorization_required") priorAuthRoutedCount++;
    }

    const auditLogs = await store.listAuditLogs({});
    const auditEventsCreated = auditLogs.length;

    return NextResponse.json({
      success: true,
      totalCases: updatedCases.length,
      approvedCount,
      riskyStoppedCount,
      priorAuthRoutedCount,
      auditEventsCreated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

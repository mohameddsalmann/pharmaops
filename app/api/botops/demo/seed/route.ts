import { NextResponse } from "next/server";
import { requireDevOnly, guardResponse } from "@/lib/auth/route-guard";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { evaluateBotRun } from "@/lib/botops/evaluate";
import { createSummaryRecord } from "@/lib/botops/summarize";
import { sampleBotRuns } from "@/lib/mock/sample-bot-runs";

export async function POST() {
  const guard = requireDevOnly();
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const store = await getSeededBotOpsStore();
    await store.seed();

    for (const sample of sampleBotRuns) {
      const detail = await store.getRunDetail(sample.run.id);
      if (!detail) continue;

      const baseline = await store.getBaseline(
        sample.run.workflowType,
        sample.run.baselineVersion ?? sample.run.botVersion
      );

      const result = await evaluateBotRun(
        detail,
        detail.events,
        sample.expectedFields,
        sample.enteredFields,
        baseline,
        { useLlm: false }
      );

      await store.updateRun(result.run);
      await store.setEvaluatorResults(sample.run.id, result.evaluatorResults);
      await store.setFieldComparisons(sample.run.id, result.fieldComparisons);
      await store.setSummary(
        createSummaryRecord(sample.run.id, {
          summary: result.summary,
          reviewerNote: result.reviewerNote,
          engineeringExplanation: result.engineeringExplanation,
          usedLlm: result.usedLlm,
        })
      );
    }

    await store.addAuditLog({
      botRunId: null,
      actorType: "system",
      actorName: "demo_seed",
      action: "demo_seeded",
      details: { runCount: sampleBotRuns.length },
    });

    const runs = await store.listRuns();
    return NextResponse.json({ seeded: true, count: runs.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { PageHeader } from "@/components/PageHeader";
import { BotRunTable } from "@/components/botops/BotRunTable";
import { formatWorkflowType } from "@/lib/utils/format";
import { GitCompare, TrendingDown } from "lucide-react";
import Link from "next/link";

export default async function RegressionPage() {
  const store = await getSeededBotOpsStore();
  const allRuns = await store.listRuns();
  const baselines = await store.getBaselines();

  const regressionRuns = allRuns.filter(
    (r) => r.decision === "regression_detected" || r.decision === "stop_automation"
  );

  const regressionFindings: Array<{
    runId: string;
    runNumber: string;
    workflowType: string;
    botVersion: string;
    findings: string[];
    score: number;
  }> = [];

  for (const run of regressionRuns) {
    const results = await store.getEvaluatorResults(run.id);
    const regressionResult = results.find((r) => r.evaluatorName === "regression" && r.status !== "passed");
    if (regressionResult) {
      regressionFindings.push({
        runId: run.id,
        runNumber: run.runNumber,
        workflowType: run.workflowType,
        botVersion: run.botVersion,
        findings: regressionResult.findings,
        score: regressionResult.score,
      });
    }
  }

  return (
    <PageFadeIn>
      <PageHeader
        title="Regression Detection"
        description="Compare bot run performance against captured baselines"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <GitCompare className="h-4 w-4" />
            <span>{regressionRuns.length} run(s) with potential regression</span>
          </div>
          <BotRunTable runs={regressionRuns} />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Captured Baselines</h3>
            <div className="space-y-2">
              {baselines.length === 0 ? (
                <p className="text-xs text-slate-500">No baselines captured yet.</p>
              ) : (
                baselines.map((b) => (
                  <div key={b.id} className="rounded border border-navy-700/60 bg-navy-900/50 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200">{formatWorkflowType(b.workflowType)}</span>
                      <span className="text-[10px] text-slate-500">v{b.botVersion}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-slate-400">
                      <div>Pass: {b.passRate}%</div>
                      <div>Avg: {b.averageScore}</div>
                      <div>Lat: {b.averageLatencyMs}ms</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Regression Findings</h3>
            <div className="space-y-3">
              {regressionFindings.length === 0 ? (
                <p className="text-xs text-slate-500">No regression findings detected.</p>
              ) : (
                regressionFindings.map((f) => (
                  <div key={f.runId} className="rounded border border-navy-700/60 bg-navy-900/50 p-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/runs/${f.runId}`} className="text-xs font-medium text-accent-cyan hover:underline">
                        {f.runNumber}
                      </Link>
                      <span className={`font-mono text-xs font-semibold ${f.score >= 70 ? "text-amber-400" : "text-red-400"}`}>
                        {f.score}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {formatWorkflowType(f.workflowType)} · v{f.botVersion}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {f.findings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <TrendingDown className="mt-0.5 h-3 w-3 shrink-0 text-orange-400" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageFadeIn>
  );
}

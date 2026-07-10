import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { PageHeader } from "@/components/PageHeader";
import { BotRunTable } from "@/components/botops/BotRunTable";
import { TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function DriftPage() {
  const store = await getSeededBotOpsStore();
  const allRuns = await store.listRuns();

  const driftRuns = allRuns.filter(
    (r) => r.decision === "ui_drift_detected" || r.decision === "stop_automation"
  );

  const driftFindings: Array<{
    runId: string;
    runNumber: string;
    pharmacyName: string;
    findings: string[];
    score: number;
  }> = [];

  for (const run of driftRuns) {
    const results = await store.getEvaluatorResults(run.id);
    const uiDriftResult = results.find((r) => r.evaluatorName === "ui_drift" && r.status !== "passed");
    if (uiDriftResult) {
      driftFindings.push({
        runId: run.id,
        runNumber: run.runNumber,
        pharmacyName: run.pharmacyName,
        findings: uiDriftResult.findings,
        score: uiDriftResult.score,
      });
    }
  }

  return (
    <PageFadeIn>
      <PageHeader
        title="UI Drift Detection"
        description="Bot runs where screen recognition or UI selectors may have drifted"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <TrendingUp className="h-4 w-4" />
            <span>{driftRuns.length} run(s) with potential UI drift</span>
          </div>
          <BotRunTable runs={driftRuns} />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Drift Findings Detail</h3>
            <div className="space-y-3">
              {driftFindings.length === 0 ? (
                <p className="text-xs text-slate-500">No UI drift findings detected.</p>
              ) : (
                driftFindings.map((f) => (
                  <div key={f.runId} className="rounded border border-navy-700/60 bg-navy-900/50 p-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/runs/${f.runId}`} className="text-xs font-medium text-accent-cyan hover:underline">
                        {f.runNumber}
                      </Link>
                      <span className={`font-mono text-xs font-semibold ${f.score >= 70 ? "text-amber-400" : "text-red-400"}`}>
                        {f.score}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">{f.pharmacyName}</div>
                    <ul className="mt-2 space-y-1">
                      {f.findings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { computeDashboardMetrics } from "@/lib/botops/metrics";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { BotRunTable } from "@/components/botops/BotRunTable";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { Upload, CheckCircle2, AlertTriangle, Gauge, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatEvaluatorName, formatQaDecision } from "@/lib/utils/format";
import { DatabaseErrorState } from "@/components/DatabaseErrorState";

export default async function DashboardPage() {
  let runs: import("@/lib/schemas/bot-run").BotRun[] = [];
  const allEvaluatorResults: Record<string, import("@/lib/schemas/bot-run").EvaluatorResult[]> = {};
  let dbError = false;

  try {
    const store = await getSeededBotOpsStore();
    runs = await store.listRuns();

    for (const run of runs) {
      allEvaluatorResults[run.id] = await store.getEvaluatorResults(run.id);
    }
  } catch (err) {
    console.error("[dashboard] Database error:", err);
    dbError = true;
  }

  if (dbError) {
    return (
      <PageFadeIn>
        <PageHeader title="BotOps Dashboard" description="Monitor bot run evaluations, release readiness, and evaluator health" />
        <DatabaseErrorState />
      </PageFadeIn>
    );
  }

  const metrics = computeDashboardMetrics(runs, allEvaluatorResults);

  return (
    <PageFadeIn>
      <PageHeader
        title="BotOps Dashboard"
        description="Monitor bot run evaluations, release readiness, and evaluator health"
        actions={
          <Link href="/runs/import" className="btn-primary">
            <Upload className="h-4 w-4" /> Import Run
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Runs"
          value={metrics.totalRuns}
          icon={<Gauge className="h-4 w-4" />}
        />
        <MetricCard
          label="Avg Score"
          value={metrics.averageScore}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          label="Release Readiness"
          value={metrics.releaseReadinessScore}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Safe to Automate"
          value={metrics.safeToAutomateRuns}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Completed"
          value={metrics.completedRuns}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Failed"
          value={metrics.failedRuns}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Stalled"
          value={metrics.stalledRuns}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Needs Review"
          value={metrics.needsReviewRuns}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-white">Decision Distribution</h3>
          <div className="space-y-2">
            {Object.entries(metrics.decisionDistribution).map(([decision, count]) => (
              <div key={decision} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{formatQaDecision(decision)}</span>
                <span className="font-mono-data font-semibold tabular-nums text-slate-200">{count}</span>
              </div>
            ))}
            {Object.keys(metrics.decisionDistribution).length === 0 && (
              <p className="text-xs text-slate-500">No runs evaluated yet.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-white">Top Evaluator Failures</h3>
          <div className="space-y-2">
            {metrics.topFailures.map((f) => (
              <div key={f.evaluatorName} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{formatEvaluatorName(f.evaluatorName)}</span>
                <span className="font-mono-data font-semibold tabular-nums text-red-400">{f.count}</span>
              </div>
            ))}
            {metrics.topFailures.length === 0 && (
              <p className="text-xs text-slate-500">No evaluator failures detected.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-white">Recent Runs</h3>
        <BotRunTable runs={metrics.recentRuns} />
      </div>
    </PageFadeIn>
  );
}

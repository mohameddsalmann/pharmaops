import type { BotRun, EvaluatorResult } from "@/lib/schemas/bot-run";

export interface DashboardMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  stalledRuns: number;
  needsReviewRuns: number;
  safeToAutomateRuns: number;
  stopAutomationRuns: number;
  averageScore: number;
  passRate: number;
  releaseReadinessScore: number;
  riskDistribution: Record<string, number>;
  decisionDistribution: Record<string, number>;
  workflowDistribution: Record<string, number>;
  pmsDistribution: Record<string, number>;
  recentRuns: BotRun[];
  topFailures: Array<{ evaluatorName: string; count: number }>;
}

export function computeDashboardMetrics(
  runs: BotRun[],
  allEvaluatorResults: Record<string, EvaluatorResult[]>
): DashboardMetrics {
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;
  const stalledRuns = runs.filter((r) => r.status === "stalled").length;
  const needsReviewRuns = runs.filter((r) => r.status === "needs_human_review").length;

  const safeToAutomateRuns = runs.filter((r) => r.decision === "safe_to_automate").length;
  const stopAutomationRuns = runs.filter((r) => r.decision === "stop_automation").length;

  const scoredRuns = runs.filter((r) => r.overallScore !== null);
  const averageScore = scoredRuns.length > 0
    ? Math.round(scoredRuns.reduce((sum, r) => sum + (r.overallScore ?? 0), 0) / scoredRuns.length)
    : 0;

  const passRate = totalRuns > 0
    ? Math.round((safeToAutomateRuns / totalRuns) * 100)
    : 0;

  const releaseReadinessScore = scoredRuns.length > 0
    ? Math.round(scoredRuns.reduce((sum, r) => sum + (r.releaseReadinessScore ?? 0), 0) / scoredRuns.length)
    : 0;

  const riskDistribution = countBy(runs, (r) => r.riskLevel ?? "unknown");
  const decisionDistribution = countBy(runs, (r) => r.decision ?? "pending");
  const workflowDistribution = countBy(runs, (r) => r.workflowType);
  const pmsDistribution = countBy(runs, (r) => r.pmsType);

  const recentRuns = [...runs]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 10);

  const failureCounts = new Map<string, number>();
  for (const results of Object.values(allEvaluatorResults)) {
    for (const r of results) {
      if (r.status === "failed") {
        failureCounts.set(r.evaluatorName, (failureCounts.get(r.evaluatorName) ?? 0) + 1);
      }
    }
  }
  const topFailures = Array.from(failureCounts.entries())
    .map(([evaluatorName, count]) => ({ evaluatorName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalRuns,
    completedRuns,
    failedRuns,
    stalledRuns,
    needsReviewRuns,
    safeToAutomateRuns,
    stopAutomationRuns,
    averageScore,
    passRate,
    releaseReadinessScore,
    riskDistribution,
    decisionDistribution,
    workflowDistribution,
    pmsDistribution,
    recentRuns,
    topFailures,
  };
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

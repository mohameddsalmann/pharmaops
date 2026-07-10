import type { EvaluatorResult, Severity } from "@/lib/schemas/bot-run";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

const LATENCY_THRESHOLD_MS = 5000;
const TOTAL_RUN_THRESHOLD_MS = 120000;

export const latencyEvaluator: Evaluator = {
  name: "latency",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, workflowSpec } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];

    const threshold = workflowSpec?.latencyThresholdMs ?? LATENCY_THRESHOLD_MS;

    const slowEvents = events.filter((e) => e.durationMs > threshold);
    for (const ev of slowEvents) {
      findings.push(
        `Slow event at step ${ev.stepNumber} on "${ev.screenName}" — ${ev.durationMs}ms (threshold: ${threshold}ms)`
      );
      const overage = ev.durationMs - threshold;
      const points = Math.min(15, Math.floor(overage / 1000) * 2);
      deductionReasons.push({
        label: `Slow ${ev.screenName}: ${ev.durationMs}ms`,
        points,
      });
      evidenceEventIds.push(ev.id);
    }

    const totalDuration = events.reduce((sum, e) => sum + e.durationMs, 0);
    if (totalDuration > TOTAL_RUN_THRESHOLD_MS) {
      findings.push(`Total run duration ${totalDuration}ms exceeds threshold ${TOTAL_RUN_THRESHOLD_MS}ms`);
      deductionReasons.push({
        label: `Total duration ${totalDuration}ms`,
        points: 10,
      });
    }

    const avgDuration = events.length > 0 ? totalDuration / events.length : 0;
    if (avgDuration > 3000) {
      findings.push(`Average event duration ${avgDuration.toFixed(0)}ms is above 3000ms`);
      deductionReasons.push({
        label: `High avg duration: ${avgDuration.toFixed(0)}ms`,
        points: 5,
      });
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = slowEvents.length > 2 || totalDuration > TOTAL_RUN_THRESHOLD_MS ? "warning" : slowEvents.length > 0 ? "warning" : "passed";
    const severity: Severity = totalDuration > TOTAL_RUN_THRESHOLD_MS ? "high" : slowEvents.length > 0 ? "medium" : "low";

    const recommendedAction =
      status === "passed"
        ? "Latency within acceptable thresholds."
        : "Optimize slow steps — investigate screen load times and processing delays.";

    return {
      result: makeResult(
        run.id,
        "latency",
        score,
        status,
        severity,
        findings.length > 0 ? findings : [`Latency within thresholds (total: ${totalDuration}ms, avg: ${avgDuration.toFixed(0)}ms).`],
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons: [],
    };
  },
};

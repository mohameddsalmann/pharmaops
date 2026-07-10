import type { EvaluatorResult, Severity } from "@/lib/schemas/bot-run";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

export const regressionEvaluator: Evaluator = {
  name: "regression",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, baseline } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];

    if (!baseline) {
      return {
        result: makeResult(
          run.id,
          "regression",
          100,
          "passed",
          "low",
          ["No baseline available for comparison — regression check skipped."],
          "Capture a baseline for this workflow/bot version to enable regression detection.",
          [],
          []
        ),
        fieldComparisons: [],
      };
    }

    const avgConfidence =
      events.length > 0
        ? events.reduce((sum, e) => sum + e.confidence, 0) / events.length
        : 0;

    const totalLatency = events.reduce((sum, e) => sum + e.durationMs, 0);

    const baselineLatency = baseline.averageLatencyMs;
    const latencyDegradation = totalLatency > baselineLatency * 1.5;
    const latencyRegressionPct = baselineLatency > 0
      ? ((totalLatency - baselineLatency) / baselineLatency) * 100
      : 0;

    if (latencyDegradation) {
      findings.push(
        `Latency regression: ${totalLatency}ms vs baseline ${baselineLatency}ms (${latencyRegressionPct.toFixed(1)}% slower)`
      );
      deductionReasons.push({
        label: `Latency regression: ${latencyRegressionPct.toFixed(0)}% slower`,
        points: 20,
      });
    }

    const baselineConfidence = baseline.averageScore / 100;
    if (avgConfidence < baselineConfidence * 0.85) {
      const confidenceDrop = ((baselineConfidence - avgConfidence) / baselineConfidence) * 100;
      findings.push(
        `Confidence regression: avg ${avgConfidence.toFixed(2)} vs baseline ${baselineConfidence.toFixed(2)} (${confidenceDrop.toFixed(1)}% drop)`
      );
      deductionReasons.push({
        label: `Confidence drop: ${confidenceDrop.toFixed(0)}%`,
        points: 25,
      });
    }

    const newExceptionTypes = detectNewExceptionTypes(events, baseline.knownExceptionTypes);
    for (const newType of newExceptionTypes) {
      findings.push(`New exception type detected not in baseline: ${newType}`);
      deductionReasons.push({ label: `New exception: ${newType}`, points: 15 });
    }

    if (run.botVersion !== baseline.botVersion) {
      findings.push(`Bot version ${run.botVersion} differs from baseline ${baseline.botVersion} — comparing against older baseline`);
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = totalDeduction >= 40 ? "failed" : totalDeduction > 0 ? "warning" : "passed";
    const severity: Severity = totalDeduction >= 40 ? "high" : totalDeduction > 0 ? "medium" : "low";

    const recommendedAction =
      status === "passed"
        ? `No regression detected vs baseline ${baseline.botVersion}.`
        : status === "failed"
          ? `Regression detected vs baseline ${baseline.botVersion} — do not release. Investigate performance and confidence degradation.`
          : `Minor regression vs baseline ${baseline.botVersion} — review before release.`;

    return {
      result: makeResult(
        run.id,
        "regression",
        score,
        status,
        severity,
        findings.length > 0 ? findings : [`No regression vs baseline ${baseline.botVersion}.`],
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons: [],
    };
  },
};

function detectNewExceptionTypes(
  events: { actionSummary: string; actionType: string }[],
  knownTypes: string[]
): string[] {
  const newTypes: string[] = [];
  const exceptionEvents = events.filter((e) => e.actionType === "exception");
  for (const ex of exceptionEvents) {
    const summary = ex.actionSummary.toLowerCase();
    for (const known of knownTypes) {
      if (summary.includes(known.toLowerCase().replace(/_/g, " "))) {
        break;
      }
    }
    if (summary.includes("prior authorization") && !knownTypes.includes("prior_authorization_required")) {
      if (!newTypes.includes("prior_authorization_required")) newTypes.push("prior_authorization_required");
    }
    if (summary.includes("low confidence") && !knownTypes.includes("low_confidence")) {
      if (!newTypes.includes("low_confidence")) newTypes.push("low_confidence");
    }
    if (summary.includes("dob mismatch") && !knownTypes.includes("dob_mismatch")) {
      if (!newTypes.includes("dob_mismatch")) newTypes.push("dob_mismatch");
    }
    if (summary.includes("ui drift") && !knownTypes.includes("ui_drift")) {
      if (!newTypes.includes("ui_drift")) newTypes.push("ui_drift");
    }
  }
  return newTypes;
}

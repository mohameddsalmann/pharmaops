import type { EvaluatorResult, Severity } from "@/lib/schemas/bot-run";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

const CONFIDENCE_THRESHOLD = 0.75;

export const uiDriftEvaluator: Evaluator = {
  name: "ui_drift",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, workflowSpec } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];

    const threshold = workflowSpec?.confidenceThreshold ?? CONFIDENCE_THRESHOLD;

    const screenReadEvents = events.filter((e) => e.actionType === "screen_read");
    const clickEvents = events.filter((e) => e.actionType === "click");

    let lowConfidenceScreens = 0;
    let failedClicks = 0;

    for (const sr of screenReadEvents) {
      if (sr.confidence < threshold) {
        lowConfidenceScreens++;
        findings.push(
          `Low confidence screen read on "${sr.screenName}" (confidence: ${sr.confidence.toFixed(2)}, threshold: ${threshold})`
        );
        deductionReasons.push({
          label: `Low confidence screen read: ${sr.screenName} (${sr.confidence.toFixed(2)})`,
          points: 15,
        });
        evidenceEventIds.push(sr.id);
      }
    }

    for (const cl of clickEvents) {
      if (cl.status === "failed" || cl.confidence < 0.3) {
        failedClicks++;
        findings.push(
          `Failed click action on "${cl.screenName}" — possible UI element not found (confidence: ${cl.confidence.toFixed(2)})`
        );
        deductionReasons.push({
          label: `Failed click on ${cl.screenName}`,
          points: 20,
        });
        evidenceEventIds.push(cl.id);
      }
    }

    const retryClicks = clickEvents.filter((c) =>
      c.actionSummary.toLowerCase().includes("retry")
    );
    if (retryClicks.length >= 2) {
      findings.push(`Multiple retry clicks detected (${retryClicks.length}) — possible UI drift on "${retryClicks[0].screenName}"`);
      deductionReasons.push({
        label: `Multiple retries on ${retryClicks[0].screenName}`,
        points: 25,
      });
      evidenceEventIds.push(...retryClicks.map((e) => e.id));
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = failedClicks > 0 || retryClicks.length >= 2 ? "failed" : lowConfidenceScreens > 0 ? "warning" : "passed";
    const severity: Severity = failedClicks > 0 ? "high" : lowConfidenceScreens > 0 ? "medium" : "low";

    const recommendedAction =
      status === "passed"
        ? "No UI drift detected — all screen reads and clicks at expected confidence."
        : status === "failed"
          ? "UI drift detected — update bot selectors or screen recognition model for affected screens."
          : "Monitor screen read confidence — some screens below threshold.";

    return {
      result: makeResult(
        run.id,
        "ui_drift",
        score,
        status,
        severity,
        findings.length > 0 ? findings : ["No UI drift detected."],
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons: [],
    };
  },
};

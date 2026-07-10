import type { EvaluatorResult, Severity } from "@/lib/schemas/bot-run";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

const LOOP_THRESHOLD = 3;
const STALL_TIMEOUT_MS = 30000;

export const loopStallDetectionEvaluator: Evaluator = {
  name: "loop_stall_detection",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, workflowSpec } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];

    const loopThreshold = workflowSpec ? workflowSpec.allowedRetries + 1 : LOOP_THRESHOLD;

    const screenActionCounts = new Map<string, number>();
    for (const event of events) {
      const key = `${event.screenName}:${event.actionType}`;
      screenActionCounts.set(key, (screenActionCounts.get(key) ?? 0) + 1);
    }

    let loopDetected = false;
    for (const [key, count] of screenActionCounts) {
      if (count >= loopThreshold) {
        loopDetected = true;
        findings.push(`Loop detected: action "${key}" repeated ${count} times (threshold: ${loopThreshold})`);
        deductionReasons.push({ label: `Loop on ${key} (${count}x)`, points: 30 });
        const loopEvents = events.filter(
          (e) => `${e.screenName}:${e.actionType}` === key
        );
        evidenceEventIds.push(...loopEvents.map((e) => e.id));
      }
    }

    let stallDetected = false;
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].timestamp).getTime();
      const curr = new Date(events[i].timestamp).getTime();
      const gap = curr - prev;
      if (gap > STALL_TIMEOUT_MS) {
        stallDetected = true;
        findings.push(
          `Stall detected: ${gap}ms gap between step ${events[i - 1].stepNumber} and ${events[i].stepNumber} (threshold: ${STALL_TIMEOUT_MS}ms)`
        );
        deductionReasons.push({ label: `Stall: ${gap}ms gap`, points: 20 });
        evidenceEventIds.push(events[i].id);
      }
    }

    const decliningConfidence = checkDecliningConfidence(events);
    if (decliningConfidence.detected) {
      findings.push(`Declining confidence across retries — possible stuck state`);
      deductionReasons.push({ label: "Declining confidence on retries", points: 15 });
      evidenceEventIds.push(...decliningConfidence.eventIds);
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = loopDetected || stallDetected ? "failed" : decliningConfidence.detected ? "warning" : "passed";
    const severity: Severity = loopDetected ? "critical" : stallDetected ? "high" : decliningConfidence.detected ? "medium" : "low";

    const recommendedAction =
      status === "passed"
        ? "No loops or stalls detected — run progressed smoothly."
        : loopDetected
          ? "Fix loop prevention logic — add max retry limit and break out of repetitive actions."
          : stallDetected
            ? "Investigate stall points — check for timeout handling and network issues."
            : "Monitor confidence trends — bot may be entering a stuck state.";

    return {
      result: makeResult(
        run.id,
        "loop_stall_detection",
        score,
        status,
        severity,
        findings.length > 0 ? findings : ["No loops or stalls detected."],
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons: [],
    };
  },
};

function checkDecliningConfidence(events: { confidence: number; id: string }[]): {
  detected: boolean;
  eventIds: string[];
} {
  if (events.length < 4) return { detected: false, eventIds: [] };
  let consecutiveDecline = 0;
  let maxDecline = 0;
  let declineEventIds: string[] = [];

  for (let i = 1; i < events.length; i++) {
    if (events[i].confidence < events[i - 1].confidence) {
      consecutiveDecline++;
      if (consecutiveDecline > maxDecline) {
        maxDecline = consecutiveDecline;
        declineEventIds = [events[i].id];
      }
    } else {
      consecutiveDecline = 0;
    }
  }

  return {
    detected: maxDecline >= 3,
    eventIds: declineEventIds,
  };
}

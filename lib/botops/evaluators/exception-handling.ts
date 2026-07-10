import type { EvaluatorResult, Severity } from "@/lib/schemas/bot-run";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

export const exceptionHandlingEvaluator: Evaluator = {
  name: "exception_handling",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, workflowSpec } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];

    const exceptionEvents = events.filter((e) => e.actionType === "exception");
    const handoffEvents = events.filter((e) => e.actionType === "human_handoff");
    const failedEvents = events.filter((e) => e.status === "failed");
    const handoffConditions = workflowSpec?.handoffConditions ?? [];

    evidenceEventIds.push(...exceptionEvents.map((e) => e.id));
    evidenceEventIds.push(...handoffEvents.map((e) => e.id));

    if (exceptionEvents.length === 0 && failedEvents.length === 0) {
      // Still check if any handoff condition was triggered in other events
      let conditionTriggered = false;
      for (const ev of events) {
        for (const cond of handoffConditions) {
          if (ev.actionSummary.toLowerCase().includes(cond.toLowerCase())) {
            conditionTriggered = true;
          }
        }
      }
      if (!conditionTriggered) {
        return {
          result: makeResult(
            run.id,
            "exception_handling",
            100,
            "passed",
            "low",
            ["No exceptions or handoff conditions detected during run."],
            "No action needed — no exceptions encountered.",
            evidenceEventIds,
            []
          ),
          fieldComparisons: [],
        };
      }
    }

    let unhandledExceptions = 0;

    // Check general exceptions
    for (const ex of exceptionEvents) {
      const hasHandoff = handoffEvents.some(
        (h) => h.stepNumber > ex.stepNumber
      );
      if (!hasHandoff) {
        unhandledExceptions++;
        findings.push(`Exception at step ${ex.stepNumber} was not followed by a human handoff`);
        deductionReasons.push({ label: `Unhandled exception at step ${ex.stepNumber}`, points: 20 });
      } else {
        findings.push(`Exception at step ${ex.stepNumber} correctly handled with human handoff`);
      }
    }

    // Check spec-defined handoff conditions (e.g., prior auth required)
    for (const ev of events) {
      for (const cond of handoffConditions) {
        if (ev.actionSummary.toLowerCase().includes(cond.toLowerCase()) || 
            ev.screenName.toLowerCase().includes(cond.toLowerCase())) {
          const hasHandoff = handoffEvents.some((h) => h.stepNumber > ev.stepNumber);
          if (!hasHandoff) {
            unhandledExceptions++;
            findings.push(`Handoff condition "${cond}" met at step ${ev.stepNumber} but was not followed by human handoff`);
            deductionReasons.push({ label: `Missing handoff for: ${cond}`, points: 20 });
          }
        }
      }
    }

    for (const fail of failedEvents) {
      if (fail.actionType !== "exception") {
        const hasFollowingException = exceptionEvents.some(
          (ex) => ex.stepNumber > fail.stepNumber
        );
        const hasFollowingHandoff = handoffEvents.some(
          (h) => h.stepNumber > fail.stepNumber
        );
        if (!hasFollowingException && !hasFollowingHandoff) {
          findings.push(`Failed event at step ${fail.stepNumber} on "${fail.screenName}" was not caught by exception handler`);
          deductionReasons.push({ label: `Uncatched failure at step ${fail.stepNumber}`, points: 15 });
        }
      }
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = unhandledExceptions > 0 ? "failed" : "passed";
    const severity: Severity = unhandledExceptions > 0 ? "high" : "low";

    const recommendedAction =
      status === "passed"
        ? "All exceptions were correctly handled with human handoff."
        : "Fix exception handling — some exceptions were not followed by human handoff.";

    return {
      result: makeResult(
        run.id,
        "exception_handling",
        score,
        status,
        severity,
        findings,
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons: [],
    };
  },
};

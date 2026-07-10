import type { EvaluatorResult, Severity } from "@/lib/schemas/bot-run";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

export const workflowComplianceEvaluator: Evaluator = {
  name: "workflow_compliance",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, workflowSpec } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];

    const requiredSteps = workflowSpec?.requiredScreens ?? [];
    const requiredStepOrder = workflowSpec?.requiredStepOrder ?? [];

    let missingSteps = 0;
    for (const step of requiredSteps) {
      const found = events.some((e) => e.screenName === step);
      if (!found) {
        missingSteps++;
        findings.push(`Required screen "${step}" was not visited during workflow`);
        deductionReasons.push({ label: `Missing required screen: ${step}`, points: 15 });
      }
    }

    const outOfOrder = checkStepOrder(events, requiredStepOrder);
    for (const issue of outOfOrder) {
      findings.push(issue.description);
      deductionReasons.push({ label: issue.label, points: 10 });
      evidenceEventIds.push(issue.eventId);
    }

    const hasFinalSubmit = events.some(
      (e) => e.screenName === "Final Review" && e.actionType === "click"
    );
    if (!hasFinalSubmit && requiredSteps.includes("Final Review")) {
      findings.push("Workflow did not complete — no Submit action on Final Review screen");
      deductionReasons.push({ label: "No final submit action", points: 20 });
    }

    const humanHandoffEvents = events.filter((e) => e.actionType === "human_handoff");
    if (humanHandoffEvents.length > 0) {
      findings.push(`Bot correctly routed to human review (${humanHandoffEvents.length} handoff event(s))`);
      evidenceEventIds.push(...humanHandoffEvents.map((e) => e.id));
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = missingSteps > 0 || !hasFinalSubmit ? "failed" : outOfOrder.length > 0 ? "warning" : "passed";
    const severity: Severity = missingSteps > 0 ? "high" : outOfOrder.length > 0 ? "medium" : "low";

    const recommendedAction =
      status === "passed"
        ? "Workflow completed in correct order with all required steps."
        : missingSteps > 0
          ? "Fix workflow routing — required screens were skipped."
          : "Review step ordering logic — steps executed out of expected sequence.";

    return {
      result: makeResult(
        run.id,
        "workflow_compliance",
        score,
        status,
        severity,
        findings.length > 0 ? findings : ["Workflow completed all required steps in correct order."],
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons: [],
    };
  },
};

function checkStepOrder(
  events: { screenName: string; id: string }[],
  requiredSteps: string[]
): Array<{ description: string; label: string; eventId: string }> {
  const issues: Array<{ description: string; label: string; eventId: string }> = [];
  let lastRequiredIndex = -1;
  for (const event of events) {
    const stepIndex = requiredSteps.indexOf(event.screenName);
    if (stepIndex !== -1) {
      if (stepIndex < lastRequiredIndex) {
        issues.push({
          description: `Screen "${event.screenName}" visited out of expected order`,
          label: `Out-of-order step: ${event.screenName}`,
          eventId: event.id,
        });
      }
      lastRequiredIndex = Math.max(lastRequiredIndex, stepIndex);
    }
  }
  return issues;
}

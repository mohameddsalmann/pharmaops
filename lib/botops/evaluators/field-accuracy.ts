import type { EvaluatorResult, FieldComparison, Severity } from "@/lib/schemas/bot-run";
import { generateId } from "@/lib/utils/id";
import type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";
import { makeResult } from "./types";

function severityForField(fieldName: string): Severity {
  const criticalFields = ["quantity", "medicationName", "strength", "dob"];
  const highFields = ["directions", "prescriberName", "refills", "priorAuthRequired"];
  const lower = fieldName.toLowerCase();
  if (criticalFields.some((f) => lower.includes(f.toLowerCase()))) return "critical";
  if (highFields.some((f) => lower.includes(f.toLowerCase()))) return "high";
  return "medium";
}

export const fieldAccuracyEvaluator: Evaluator = {
  name: "field_accuracy",
  evaluate(ctx: EvaluatorContext): EvaluatorOutput {
    const { run, events, expectedFields, enteredFields, workflowSpec } = ctx;
    const findings: string[] = [];
    const deductionReasons: EvaluatorResult["deductionReasons"] = [];
    const evidenceEventIds: string[] = [];
    const fieldComparisons: FieldComparison[] = [];

    const fieldEntryEvents = events.filter(
      (e) => e.actionType === "field_entry" || e.actionType === "field_extract"
    );
    evidenceEventIds.push(...fieldEntryEvents.map((e) => e.id));

    const allFields = new Set([...Object.keys(expectedFields), ...Object.keys(enteredFields)]);
    let mismatchCount = 0;
    let criticalMismatch = false;

    for (const fieldName of allFields) {
      const expected = expectedFields[fieldName] ?? null;
      const actual = enteredFields[fieldName] ?? null;
      const match = expected !== null && actual !== null && expected === actual;
      const severity = match ? "low" : severityForField(fieldName);

      fieldComparisons.push({
        id: generateId(),
        botRunId: run.id,
        fieldName,
        expectedValue: expected,
        actualValue: actual,
        match,
        severity,
      });

      if (!match) {
        mismatchCount++;
        if (severity === "critical") criticalMismatch = true;
        findings.push(
          `Field "${fieldName}" mismatch: expected "${expected}" but got "${actual}"`
        );
        const points = severity === "critical" ? 25 : severity === "high" ? 15 : 8;
        deductionReasons.push({ label: `Mismatch on ${fieldName} (${severity})`, points });
      }
    }

    const requiredFieldsFromSpec = workflowSpec?.requiredFields ?? Object.keys(expectedFields);
    const missingFields = requiredFieldsFromSpec.filter(
      (k) => !enteredFields[k] || enteredFields[k] === ""
    );
    for (const mf of missingFields) {
      const severity = severityForField(mf);
      findings.push(`Required field "${mf}" was not entered`);
      const points = severity === "critical" ? 20 : severity === "high" ? 12 : 6;
      deductionReasons.push({ label: `Missing field ${mf} (${severity})`, points });
    }

    const totalDeduction = deductionReasons.reduce((sum, r) => sum + r.points, 0);
    const score = Math.max(0, 100 - totalDeduction);
    const status = criticalMismatch ? "failed" : mismatchCount > 0 || missingFields.length > 0 ? "warning" : "passed";
    const severity: Severity = criticalMismatch ? "critical" : mismatchCount > 0 ? "high" : "low";

    const recommendedAction =
      status === "passed"
        ? "No action needed — all fields match expected values."
        : criticalMismatch
          ? "BLOCK automation — critical field mismatch detected. Investigate extraction/entry logic immediately."
          : mismatchCount > 0
            ? "Review mismatched fields and correct extraction or entry logic."
            : "Ensure all required fields are entered.";

    return {
      result: makeResult(
        run.id,
        "field_accuracy",
        score,
        status,
        severity,
        findings.length > 0 ? findings : ["All fields match expected values."],
        recommendedAction,
        evidenceEventIds,
        deductionReasons
      ),
      fieldComparisons,
    };
  },
};

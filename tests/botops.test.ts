import { describe, it, expect } from "vitest";
import { redactPhiFromText } from "@/lib/botops/redaction";
import { fieldAccuracyEvaluator } from "@/lib/botops/evaluators/field-accuracy";
import { workflowComplianceEvaluator } from "@/lib/botops/evaluators/workflow-compliance";
import { loopStallDetectionEvaluator } from "@/lib/botops/evaluators/loop-stall-detection";
import { latencyEvaluator } from "@/lib/botops/evaluators/latency";
import { computeScoring } from "@/lib/botops/scoring";
import type { BotRun, BotRunEvent, EvaluatorResult } from "@/lib/schemas/bot-run";
import { EVALUATOR_VERSION } from "@/lib/botops/versions";

const baseRun: BotRun = {
  id: "test-run-1",
  runNumber: "BR-TEST-001",
  pharmacyId: "pharm-001",
  pharmacyName: "Test Pharmacy",
  pmsType: "pioneer",
  workflowType: "prescription_intake",
  botVersion: "1.0.0",
  environment: "demo",
  startedAt: "2024-01-01T10:00:00Z",
  completedAt: "2024-01-01T10:02:00Z",
  status: "completed",
  finalOutcome: "Test run completed",
  containsPhi: false,
  phiRedacted: true,
  safeForReview: true,
  redactionFindings: [],
  overallScore: null,
  riskLevel: null,
  decision: null,
  mainFinding: null,
  recommendedAction: null,
  baselineVersion: null,
  scenarioId: null,
  expectedFields: {},
  botRunSchemaVersion: "1.0.0",
  releaseReadinessScore: null,
  mainRisk: null,
  recommendedEngineeringAction: null,
  recommendedQaAction: null,
  workflowSpecVersion: "1.0.0",
  workflowSpecId: null,
  workflowSpecHash: null,
};

function makeEvent(overrides: Partial<BotRunEvent>): BotRunEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    botRunId: "test-run-1",
    stepNumber: 1,
    timestamp: "2024-01-01T10:00:00Z",
    screenName: "Test Screen",
    actionType: "screen_read",
    actionSummary: "Test action",
    confidence: 0.95,
    durationMs: 1000,
    status: "success",
    extractedFields: {},
    enteredFields: {},
    eventSchemaVersion: "1.0.0",
    ...overrides,
  };
}

function makeCtx(overrides: Partial<{
  run: BotRun;
  events: BotRunEvent[];
  expectedFields: Record<string, string>;
  enteredFields: Record<string, string>;
}>) {
  return {
    run: baseRun,
    events: [] as BotRunEvent[],
    expectedFields: {} as Record<string, string>,
    enteredFields: {} as Record<string, string>,
    baseline: null,
    ...overrides,
  };
}

function makeEvaluatorResult(overrides: Partial<EvaluatorResult>): EvaluatorResult {
  return {
    id: `er-${Math.random().toString(36).slice(2)}`,
    botRunId: "test-run-1",
    evaluatorName: "field_accuracy",
    evaluatorVersion: EVALUATOR_VERSION,
    status: "passed",
    severity: "low",
    score: 100,
    findings: [],
    deductionReasons: [],
    evidenceEventIds: [],
    recommendedAction: "No action needed",
    ...overrides,
  };
}

describe("PHI Redaction", () => {
  it("should redact email addresses", () => {
    const { redacted, findings } = redactPhiFromText("Contact john@example.com for details");
    expect(redacted).not.toContain("john@example.com");
    expect(findings).toContain("Email");
  });

  it("should redact phone numbers", () => {
    const { redacted, findings } = redactPhiFromText("Call 555-123-4567");
    expect(redacted).not.toContain("555-123-4567");
    expect(findings).toContain("Phone Number");
  });

  it("should redact SSN", () => {
    const { redacted, findings } = redactPhiFromText("SSN: 123-45-6789");
    expect(redacted).not.toContain("123-45-6789");
    expect(findings).toContain("SSN");
  });

  it("should redact DOB", () => {
    const { redacted, findings } = redactPhiFromText("DOB: 01/15/1990");
    expect(redacted).not.toContain("01/15/1990");
    expect(findings).toContain("Date of Birth");
  });

  it("should not modify text without PHI", () => {
    const { redacted, findings } = redactPhiFromText("No sensitive data here");
    expect(redacted).toBe("No sensitive data here");
    expect(findings).toHaveLength(0);
  });
});

describe("Field Accuracy Evaluator", () => {
  it("should pass when all fields match", () => {
    const output = fieldAccuracyEvaluator.evaluate(makeCtx({
      expectedFields: { medication: "Lisinopril", strength: "10mg" },
      enteredFields: { medication: "Lisinopril", strength: "10mg" },
    }));
    expect(output.result.status).toBe("passed");
    expect(output.result.score).toBe(100);
  });

  it("should fail when fields mismatch", () => {
    const output = fieldAccuracyEvaluator.evaluate(makeCtx({
      expectedFields: { medication: "Lisinopril", strength: "10mg" },
      enteredFields: { medication: "Lisinopril", strength: "20mg" },
    }));
    expect(output.result.status).not.toBe("passed");
    expect(output.result.score).toBeLessThan(100);
    expect(output.result.findings.length).toBeGreaterThan(0);
  });

  it("should warn when fields are missing", () => {
    const output = fieldAccuracyEvaluator.evaluate(makeCtx({
      expectedFields: { medication: "Lisinopril", strength: "10mg" },
      enteredFields: { medication: "Lisinopril" },
    }));
    expect(output.result.status).not.toBe("passed");
    expect(output.result.findings.length).toBeGreaterThan(0);
  });
});

describe("Workflow Compliance Evaluator", () => {
  it("should pass when all required screens are visited", () => {
    const events = [
      makeEvent({ screenName: "Patient Search" }),
      makeEvent({ screenName: "Prescription Entry" }),
      makeEvent({ screenName: "Final Review", actionType: "click" }),
    ];
    const output = workflowComplianceEvaluator.evaluate(makeCtx({ events }));
    expect(output.result.status).toBe("passed");
  });

  it("should fail when required screens are missing", () => {
    const events = [makeEvent({ screenName: "Patient Search" })];
    const output = workflowComplianceEvaluator.evaluate(makeCtx({ events }));
    expect(output.result.status).not.toBe("passed");
    expect(output.result.findings.length).toBeGreaterThan(0);
  });
});

describe("Loop/Stall Detection Evaluator", () => {
  it("should detect loops", () => {
    const events = [
      makeEvent({ stepNumber: 1, actionSummary: "Click submit button", actionType: "click" }),
      makeEvent({ stepNumber: 2, actionSummary: "Click submit button", actionType: "click" }),
      makeEvent({ stepNumber: 3, actionSummary: "Click submit button", actionType: "click" }),
      makeEvent({ stepNumber: 4, actionSummary: "Click submit button", actionType: "click" }),
    ];
    const output = loopStallDetectionEvaluator.evaluate(makeCtx({ events }));
    expect(output.result.status).not.toBe("passed");
    expect(output.result.findings.some((f: string) => f.toLowerCase().includes("loop"))).toBe(true);
  });

  it("should pass when no loops or stalls", () => {
    const events = [
      makeEvent({ stepNumber: 1, actionSummary: "Search patient", actionType: "screen_read" }),
      makeEvent({ stepNumber: 2, actionSummary: "Enter medication", actionType: "field_entry" }),
      makeEvent({ stepNumber: 3, actionSummary: "Submit form", actionType: "click" }),
    ];
    const output = loopStallDetectionEvaluator.evaluate(makeCtx({ events }));
    expect(output.result.status).toBe("passed");
  });
});

describe("Latency Evaluator", () => {
  it("should pass when latency is within thresholds", () => {
    const events = [
      makeEvent({ durationMs: 1000 }),
      makeEvent({ durationMs: 2000 }),
    ];
    const output = latencyEvaluator.evaluate(makeCtx({ events }));
    expect(output.result.status).toBe("passed");
  });

  it("should warn when per-event latency exceeds threshold", () => {
    const events = [
      makeEvent({ durationMs: 6000 }),
    ];
    const output = latencyEvaluator.evaluate(makeCtx({ events }));
    expect(output.result.status).not.toBe("passed");
  });
});

describe("Scoring", () => {
  it("should produce safe_to_automate for high scores", () => {
    const results: EvaluatorResult[] = [
      makeEvaluatorResult({
        evaluatorName: "field_accuracy",
        status: "passed",
        severity: "low",
        score: 100,
      }),
    ];
    const scored = computeScoring(results);
    expect(scored.overallScore).toBeGreaterThanOrEqual(90);
    expect(scored.decision).toBe("safe_to_automate");
    expect(scored.riskLevel).toBe("low");
  });

  it("should produce stop_automation for critical failures", () => {
    const results: EvaluatorResult[] = [
      makeEvaluatorResult({
        evaluatorName: "field_accuracy",
        status: "failed",
        severity: "critical",
        score: 20,
        findings: ["Critical field mismatch"],
        deductionReasons: [{ label: "Critical mismatch", points: 80 }],
        recommendedAction: "Fix field mapping",
      }),
    ];
    const scored = computeScoring(results);
    expect(scored.overallScore).toBeLessThan(50);
    expect(scored.decision).toBe("stop_automation");
    expect(scored.riskLevel).toBe("critical");
  });
});

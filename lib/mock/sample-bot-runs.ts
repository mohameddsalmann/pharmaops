import type {
  BotRun,
  BotRunEvent,
  RegressionBaseline,
} from "@/lib/schemas/bot-run";

type SampleRunEvent = Omit<BotRunEvent, "id" | "botRunId" | "eventSchemaVersion">;

export interface SampleBotRun {
  run: Omit<
    BotRun,
    | "overallScore"
    | "riskLevel"
    | "decision"
    | "mainFinding"
    | "recommendedAction"
    | "releaseReadinessScore"
    | "mainRisk"
    | "recommendedEngineeringAction"
    | "recommendedQaAction"
    | "containsPhi"
    | "phiRedacted"
    | "safeForReview"
    | "redactionFindings"
    | "botRunSchemaVersion"
    | "scenarioId"
    | "expectedFields"
    | "workflowSpecVersion"
    | "workflowSpecId"
    | "workflowSpecHash"
    | "executionStatus"
    | "evaluationStatus"
    | "completionClientId"
  >;
  events: SampleRunEvent[];
  expectedFields: Record<string, string>;
  enteredFields: Record<string, string>;
  baselineVersion?: string;
}

export const regressionBaselines: RegressionBaseline[] = [
  {
    id: "baseline-rx-intake-1.2.0",
    workflowType: "prescription_intake",
    botVersion: "1.2.0",
    passRate: 94,
    averageLatencyMs: 92000,
    averageScore: 88,
    failureCount: 2,
    completionRate: 96,
    knownExceptionTypes: ["prior_authorization_required", "low_confidence"],
    capturedAt: "2025-06-15T10:00:00Z",
  },
  {
    id: "baseline-data-entry-1.2.0",
    workflowType: "data_entry",
    botVersion: "1.2.0",
    passRate: 91,
    averageLatencyMs: 75000,
    averageScore: 85,
    failureCount: 3,
    completionRate: 93,
    knownExceptionTypes: ["missing_required_field", "low_confidence"],
    capturedAt: "2025-06-15T10:00:00Z",
  },
];

const now = new Date();
function ts(offsetSec: number): string {
  return new Date(now.getTime() + offsetSec * 1000).toISOString();
}

export const sampleBotRuns: SampleBotRun[] = [
  {
    run: {
      id: "run-001-clean-intake",
      runNumber: "BR-0001",
      pharmacyId: "pharm-001",
      pharmacyName: "TJM Labs — Central Fill",
      pmsType: "pioneer",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "demo",
      startedAt: ts(0),
      completedAt: ts(85),
      status: "completed",
      finalOutcome: "Prescription intake completed successfully. All fields extracted and entered correctly.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(0), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.95, durationMs: 1200, status: "success" },
      { stepNumber: 2, timestamp: ts(2), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB for search", enteredFields: { dob: "01/15/1980" }, confidence: 0.96, durationMs: 800, status: "success" },
      { stepNumber: 3, timestamp: ts(4), screenName: "Patient Search", actionType: "click", actionSummary: "Selected patient match from results", confidence: 0.97, durationMs: 500, status: "success" },
      { stepNumber: 4, timestamp: ts(6), screenName: "Prescription Entry", actionType: "navigation", actionSummary: "Navigated to prescription entry screen", confidence: 0.94, durationMs: 1500, status: "success" },
      { stepNumber: 5, timestamp: ts(10), screenName: "Prescription Entry", actionType: "field_extract", actionSummary: "Extracted medication name from prescription image", extractedFields: { medicationName: "Lisinopril", strength: "10mg", quantity: "30", directions: "Take 1 tablet by mouth daily", prescriberName: "Dr. Smith", refills: "3" }, confidence: 0.93, durationMs: 3200, status: "success" },
      { stepNumber: 6, timestamp: ts(15), screenName: "Prescription Entry", actionType: "field_entry", actionSummary: "Entered SIG directions", enteredFields: { medicationName: "Lisinopril", strength: "10mg", quantity: "30", directions: "Take 1 tablet by mouth daily", prescriberName: "Dr. Smith", refills: "3" }, confidence: 0.95, durationMs: 2100, status: "success" },
      { stepNumber: 7, timestamp: ts(20), screenName: "Prescription Entry", actionType: "validation", actionSummary: "Validated all required fields present", confidence: 0.92, durationMs: 800, status: "success" },
      { stepNumber: 8, timestamp: ts(25), screenName: "Final Review", actionType: "screen_read", actionSummary: "Read final review screen", confidence: 0.94, durationMs: 1000, status: "success" },
      { stepNumber: 9, timestamp: ts(30), screenName: "Final Review", actionType: "click", actionSummary: "Clicked Submit to complete intake", confidence: 0.96, durationMs: 600, status: "success" },
    ],
    expectedFields: { medicationName: "Lisinopril", strength: "10mg", quantity: "30", directions: "Take 1 tablet by mouth daily", prescriberName: "Dr. Smith", refills: "3", dob: "01/15/1980" },
    enteredFields: { medicationName: "Lisinopril", strength: "10mg", quantity: "30", directions: "Take 1 tablet by mouth daily", prescriberName: "Dr. Smith", refills: "3", dob: "01/15/1980" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-002-dob-mismatch-handoff",
      runNumber: "BR-0002",
      pharmacyId: "pharm-002",
      pharmacyName: "TJM Labs — North Location",
      pmsType: "rx30",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "demo",
      startedAt: ts(100),
      completedAt: ts(165),
      status: "needs_human_review",
      finalOutcome: "DOB mismatch detected. Bot correctly stopped and routed to human review.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(100), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.95, durationMs: 1200, status: "success" },
      { stepNumber: 2, timestamp: ts(102), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB for search", enteredFields: { dob: "03/22/1975" }, confidence: 0.88, durationMs: 800, status: "warning" },
      { stepNumber: 3, timestamp: ts(104), screenName: "Patient Search", actionType: "click", actionSummary: "Selected patient match from results", confidence: 0.72, durationMs: 500, status: "warning" },
      { stepNumber: 4, timestamp: ts(106), screenName: "Patient Profile", actionType: "screen_read", actionSummary: "Read patient profile — DOB on file differs from entered DOB", extractedFields: { dobOnFile: "03/22/1976", enteredDob: "03/22/1975" }, confidence: 0.65, durationMs: 1500, status: "warning" },
      { stepNumber: 5, timestamp: ts(110), screenName: "Exception Handler", actionType: "exception", actionSummary: "Detected DOB mismatch — stopping automation", confidence: 0.91, durationMs: 600, status: "warning" },
      { stepNumber: 6, timestamp: ts(115), screenName: "Human Review Queue", actionType: "human_handoff", actionSummary: "Routed case to human review queue with mismatch details", confidence: 0.95, durationMs: 400, status: "success" },
    ],
    expectedFields: { dob: "03/22/1976" },
    enteredFields: { dob: "03/22/1975" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-003-prior-auth-routed",
      runNumber: "BR-0003",
      pharmacyId: "pharm-001",
      pharmacyName: "TJM Labs — Central Fill",
      pmsType: "pioneer",
      workflowType: "prior_authorization",
      botVersion: "1.2.0",
      environment: "demo",
      startedAt: ts(200),
      completedAt: ts(280),
      status: "needs_human_review",
      finalOutcome: "Prior authorization flag detected. Bot correctly routed to PA queue.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(200), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.95, durationMs: 1200, status: "success" },
      { stepNumber: 2, timestamp: ts(202), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB", enteredFields: { dob: "07/10/1968" }, confidence: 0.96, durationMs: 800, status: "success" },
      { stepNumber: 3, timestamp: ts(204), screenName: "Patient Search", actionType: "click", actionSummary: "Selected patient match", confidence: 0.97, durationMs: 500, status: "success" },
      { stepNumber: 4, timestamp: ts(206), screenName: "Prescription Entry", actionType: "field_extract", actionSummary: "Extracted medication — Lyrica 75mg", extractedFields: { medicationName: "Lyrica", strength: "75mg", quantity: "60" }, confidence: 0.93, durationMs: 3000, status: "success" },
      { stepNumber: 5, timestamp: ts(210), screenName: "Insurance Verification", actionType: "validation", actionSummary: "Checked insurance — Lyrica requires prior authorization", extractedFields: { priorAuthRequired: "true", planName: "BlueCross PPO" }, confidence: 0.89, durationMs: 2200, status: "warning" },
      { stepNumber: 6, timestamp: ts(215), screenName: "Exception Handler", actionType: "exception", actionSummary: "Prior authorization flag triggered — stopping automation", confidence: 0.93, durationMs: 600, status: "warning" },
      { stepNumber: 7, timestamp: ts(220), screenName: "PA Queue", actionType: "human_handoff", actionSummary: "Routed to prior authorization queue", confidence: 0.96, durationMs: 400, status: "success" },
    ],
    expectedFields: { medicationName: "Lyrica", strength: "75mg", quantity: "60", priorAuthRequired: "true" },
    enteredFields: { medicationName: "Lyrica", strength: "75mg", quantity: "60", priorAuthRequired: "true" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-004-ui-drift-missing-submit",
      runNumber: "BR-0004",
      pharmacyId: "pharm-003",
      pharmacyName: "TJM Labs — West Location",
      pmsType: "liberty",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "staging",
      startedAt: ts(300),
      completedAt: ts(380),
      status: "failed",
      finalOutcome: "UI drift detected: Submit button not found on Final Review screen. Bot could not complete workflow.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(300), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.95, durationMs: 1200, status: "success" },
      { stepNumber: 2, timestamp: ts(302), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB", enteredFields: { dob: "11/03/1990" }, confidence: 0.96, durationMs: 800, status: "success" },
      { stepNumber: 3, timestamp: ts(304), screenName: "Patient Search", actionType: "click", actionSummary: "Selected patient match", confidence: 0.97, durationMs: 500, status: "success" },
      { stepNumber: 4, timestamp: ts(306), screenName: "Prescription Entry", actionType: "field_extract", actionSummary: "Extracted medication fields", extractedFields: { medicationName: "Metformin", strength: "500mg", quantity: "90" }, confidence: 0.93, durationMs: 3000, status: "success" },
      { stepNumber: 5, timestamp: ts(310), screenName: "Prescription Entry", actionType: "field_entry", actionSummary: "Entered all prescription fields", enteredFields: { medicationName: "Metformin", strength: "500mg", quantity: "90" }, confidence: 0.95, durationMs: 2000, status: "success" },
      { stepNumber: 6, timestamp: ts(315), screenName: "Final Review", actionType: "screen_read", actionSummary: "Read final review screen — Submit button not found in expected position", confidence: 0.42, durationMs: 2500, status: "warning" },
      { stepNumber: 7, timestamp: ts(320), screenName: "Final Review", actionType: "click", actionSummary: "Attempted to click Submit button — element not found", confidence: 0.15, durationMs: 3000, status: "failed" },
      { stepNumber: 8, timestamp: ts(325), screenName: "Final Review", actionType: "click", actionSummary: "Retry: attempted to click Submit button — element not found", confidence: 0.12, durationMs: 3000, status: "failed" },
      { stepNumber: 9, timestamp: ts(330), screenName: "Final Review", actionType: "click", actionSummary: "Retry: attempted to click Submit button — element not found", confidence: 0.10, durationMs: 3000, status: "failed" },
      { stepNumber: 10, timestamp: ts(340), screenName: "Exception Handler", actionType: "exception", actionSummary: "UI drift detected — Submit button missing. Stopping automation.", confidence: 0.88, durationMs: 600, status: "failed" },
    ],
    expectedFields: { medicationName: "Metformin", strength: "500mg", quantity: "90" },
    enteredFields: { medicationName: "Metformin", strength: "500mg", quantity: "90" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-005-loop-stall-patient-search",
      runNumber: "BR-0005",
      pharmacyId: "pharm-002",
      pharmacyName: "TJM Labs — North Location",
      pmsType: "rx30",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "demo",
      startedAt: ts(400),
      completedAt: ts(520),
      status: "stalled",
      finalOutcome: "Loop/stall detected: bot repeated patient search action 5 times without progress.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(400), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.95, durationMs: 1200, status: "success" },
      { stepNumber: 2, timestamp: ts(402), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB", enteredFields: { dob: "06/18/1985" }, confidence: 0.94, durationMs: 800, status: "success" },
      { stepNumber: 3, timestamp: ts(404), screenName: "Patient Search", actionType: "click", actionSummary: "Clicked Search button", confidence: 0.93, durationMs: 500, status: "success" },
      { stepNumber: 4, timestamp: ts(410), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen — no results returned", confidence: 0.90, durationMs: 1200, status: "warning" },
      { stepNumber: 5, timestamp: ts(415), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Re-entered patient DOB (retry)", enteredFields: { dob: "06/18/1985" }, confidence: 0.88, durationMs: 800, status: "warning" },
      { stepNumber: 6, timestamp: ts(420), screenName: "Patient Search", actionType: "click", actionSummary: "Clicked Search button (retry)", confidence: 0.85, durationMs: 500, status: "warning" },
      { stepNumber: 7, timestamp: ts(425), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Re-entered patient DOB (retry 2)", enteredFields: { dob: "06/18/1985" }, confidence: 0.82, durationMs: 800, status: "warning" },
      { stepNumber: 8, timestamp: ts(430), screenName: "Patient Search", actionType: "click", actionSummary: "Clicked Search button (retry 2)", confidence: 0.80, durationMs: 500, status: "warning" },
      { stepNumber: 9, timestamp: ts(435), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Re-entered patient DOB (retry 3)", enteredFields: { dob: "06/18/1985" }, confidence: 0.78, durationMs: 800, status: "warning" },
      { stepNumber: 10, timestamp: ts(440), screenName: "Patient Search", actionType: "click", actionSummary: "Clicked Search button (retry 3)", confidence: 0.75, durationMs: 500, status: "warning" },
      { stepNumber: 11, timestamp: ts(445), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Re-entered patient DOB (retry 4)", enteredFields: { dob: "06/18/1985" }, confidence: 0.70, durationMs: 800, status: "warning" },
      { stepNumber: 12, timestamp: ts(450), screenName: "Patient Search", actionType: "click", actionSummary: "Clicked Search button (retry 4)", confidence: 0.68, durationMs: 500, status: "warning" },
    ],
    expectedFields: { dob: "06/18/1985" },
    enteredFields: { dob: "06/18/1985" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-006-regression-v130",
      runNumber: "BR-0006",
      pharmacyId: "pharm-001",
      pharmacyName: "TJM Labs — Central Fill",
      pmsType: "pioneer",
      workflowType: "prescription_intake",
      botVersion: "1.3.0",
      environment: "staging",
      startedAt: ts(500),
      completedAt: ts(630),
      status: "completed",
      finalOutcome: "Run completed but with degraded performance vs baseline 1.2.0. Lower confidence and higher latency.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(500), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.88, durationMs: 2100, status: "success" },
      { stepNumber: 2, timestamp: ts(503), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB", enteredFields: { dob: "09/12/1972" }, confidence: 0.85, durationMs: 1500, status: "success" },
      { stepNumber: 3, timestamp: ts(506), screenName: "Patient Search", actionType: "click", actionSummary: "Selected patient match", confidence: 0.82, durationMs: 1000, status: "success" },
      { stepNumber: 4, timestamp: ts(510), screenName: "Prescription Entry", actionType: "field_extract", actionSummary: "Extracted medication — Atorvastatin 20mg", extractedFields: { medicationName: "Atorvastatin", strength: "20mg", quantity: "30" }, confidence: 0.79, durationMs: 5500, status: "warning" },
      { stepNumber: 5, timestamp: ts(520), screenName: "Prescription Entry", actionType: "field_entry", actionSummary: "Entered prescription fields", enteredFields: { medicationName: "Atorvastatin", strength: "20mg", quantity: "30" }, confidence: 0.81, durationMs: 3500, status: "success" },
      { stepNumber: 6, timestamp: ts(530), screenName: "Prescription Entry", actionType: "validation", actionSummary: "Validated fields — prescriber name missing", confidence: 0.65, durationMs: 1800, status: "warning" },
      { stepNumber: 7, timestamp: ts(540), screenName: "Final Review", actionType: "screen_read", actionSummary: "Read final review screen", confidence: 0.78, durationMs: 2200, status: "success" },
      { stepNumber: 8, timestamp: ts(550), screenName: "Final Review", actionType: "click", actionSummary: "Clicked Submit", confidence: 0.80, durationMs: 1200, status: "success" },
    ],
    expectedFields: { medicationName: "Atorvastatin", strength: "20mg", quantity: "30", prescriberName: "Dr. Johnson" },
    enteredFields: { medicationName: "Atorvastatin", strength: "20mg", quantity: "30", prescriberName: "" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-007-low-confidence-fax",
      runNumber: "BR-0007",
      pharmacyId: "pharm-004",
      pharmacyName: "TJM Labs — Mail Order",
      pmsType: "primerx",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "demo",
      startedAt: ts(600),
      completedAt: ts(680),
      status: "needs_human_review",
      finalOutcome: "Low confidence fax extraction. Bot correctly routed to human review.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(600), screenName: "Fax Inbox", actionType: "screen_read", actionSummary: "Read fax inbox screen", confidence: 0.90, durationMs: 1500, status: "success" },
      { stepNumber: 2, timestamp: ts(603), screenName: "Fax Viewer", actionType: "field_extract", actionSummary: "Extracted fields from fax image — low quality scan", extractedFields: { medicationName: "Amoxicillin?", strength: "500mg?", quantity: "21" }, confidence: 0.52, durationMs: 4500, status: "warning" },
      { stepNumber: 3, timestamp: ts(610), screenName: "Exception Handler", actionType: "exception", actionSummary: "Extraction confidence below threshold (0.52 < 0.75) — stopping", confidence: 0.91, durationMs: 600, status: "warning" },
      { stepNumber: 4, timestamp: ts(615), screenName: "Human Review Queue", actionType: "human_handoff", actionSummary: "Routed to human review — low confidence fax extraction", confidence: 0.95, durationMs: 400, status: "success" },
    ],
    expectedFields: { medicationName: "Amoxicillin", strength: "500mg", quantity: "21" },
    enteredFields: { medicationName: "Amoxicillin?", strength: "500mg?", quantity: "21" },
    baselineVersion: "1.2.0",
  },
  {
    run: {
      id: "run-008-quantity-mismatch-failed",
      runNumber: "BR-0008",
      pharmacyId: "pharm-003",
      pharmacyName: "TJM Labs — West Location",
      pmsType: "liberty",
      workflowType: "data_entry",
      botVersion: "1.2.0",
      environment: "demo",
      startedAt: ts(700),
      completedAt: ts(780),
      status: "failed",
      finalOutcome: "Bot entered quantity 300 instead of 30 — 10x overdose quantity mismatch. Failed run.",
      baselineVersion: "1.2.0",
    },
    events: [
      { stepNumber: 1, timestamp: ts(700), screenName: "Patient Search", actionType: "screen_read", actionSummary: "Read patient search screen", confidence: 0.95, durationMs: 1200, status: "success" },
      { stepNumber: 2, timestamp: ts(702), screenName: "Patient Search", actionType: "field_entry", actionSummary: "Entered patient DOB", enteredFields: { dob: "04/25/1988" }, confidence: 0.96, durationMs: 800, status: "success" },
      { stepNumber: 3, timestamp: ts(704), screenName: "Patient Search", actionType: "click", actionSummary: "Selected patient match", confidence: 0.97, durationMs: 500, status: "success" },
      { stepNumber: 4, timestamp: ts(706), screenName: "Data Entry", actionType: "field_extract", actionSummary: "Extracted fields from prescription", extractedFields: { medicationName: "Albuterol", strength: "90mcg", quantity: "30" }, confidence: 0.91, durationMs: 3000, status: "success" },
      { stepNumber: 5, timestamp: ts(710), screenName: "Data Entry", actionType: "field_entry", actionSummary: "Entered quantity — bot entered 300 instead of 30", enteredFields: { medicationName: "Albuterol", strength: "90mcg", quantity: "300" }, confidence: 0.87, durationMs: 1800, status: "success" },
      { stepNumber: 6, timestamp: ts(715), screenName: "Data Entry", actionType: "validation", actionSummary: "Validation passed — bot did not catch quantity mismatch", confidence: 0.82, durationMs: 900, status: "success" },
      { stepNumber: 7, timestamp: ts(720), screenName: "Final Review", actionType: "screen_read", actionSummary: "Read final review screen", confidence: 0.90, durationMs: 1000, status: "success" },
      { stepNumber: 8, timestamp: ts(725), screenName: "Final Review", actionType: "click", actionSummary: "Clicked Submit — incorrect quantity submitted", confidence: 0.92, durationMs: 600, status: "success" },
    ],
    expectedFields: { medicationName: "Albuterol", strength: "90mcg", quantity: "30" },
    enteredFields: { medicationName: "Albuterol", strength: "90mcg", quantity: "300" },
    baselineVersion: "1.2.0",
  },
];

import { z } from "zod";
import {
  BOT_RUN_SCHEMA_VERSION,
  EVENT_SCHEMA_VERSION,
  EVALUATOR_VERSION,
} from "@/lib/botops/versions";

export const pmsTypeSchema = z.enum([
  "pioneer",
  "rx30",
  "liberty",
  "primerx",
  "lifefile",
  "pk_software",
  "generic",
]);
export type PmsType = z.infer<typeof pmsTypeSchema>;

export const workflowTypeSchema = z.enum([
  "prescription_intake",
  "data_entry",
  "refill_processing",
  "prior_authorization",
  "benefit_investigation",
  "patient_communication",
]);
export type WorkflowType = z.infer<typeof workflowTypeSchema>;

export const environmentSchema = z.enum([
  "demo",
  "staging",
  "production_redacted",
]);
export type Environment = z.infer<typeof environmentSchema>;

export const botRunStatusSchema = z.enum([
  "running",
  "completed",
  "evaluating",
  "evaluated",
  "failed",
  "stalled",
  "needs_human_review",
]);
export type BotRunStatus = z.infer<typeof botRunStatusSchema>;

export const executionStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "stalled",
]);
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;

export const evaluationStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
]);
export type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const qaDecisionSchema = z.enum([
  "safe_to_automate",
  "needs_qa_review",
  "regression_detected",
  "ui_drift_detected",
  "stop_automation",
]);
export type QaDecision = z.infer<typeof qaDecisionSchema>;

export const botRunSchema = z.object({
  id: z.string(),
  runNumber: z.string(),
  pharmacyId: z.string(),
  pharmacyName: z.string(),
  pmsType: pmsTypeSchema,
  workflowType: workflowTypeSchema,
  botVersion: z.string(),
  environment: environmentSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  status: botRunStatusSchema,
  finalOutcome: z.string(),
  containsPhi: z.boolean().default(false),
  phiRedacted: z.boolean().default(true),
  safeForReview: z.boolean().default(true),
  redactionFindings: z.array(z.string()).default([]),
  overallScore: z.number().nullable(),
  riskLevel: riskLevelSchema.nullable(),
  decision: qaDecisionSchema.nullable().default(null),
  mainFinding: z.string().nullable().default(null),
  recommendedAction: z.string().nullable().default(null),
  baselineVersion: z.string().nullable().default(null),
  scenarioId: z.string().nullable().default(null),
  expectedFields: z.record(z.string()).default({}),
  botRunSchemaVersion: z.string().default(BOT_RUN_SCHEMA_VERSION),
  releaseReadinessScore: z.number().nullable().default(null),
  mainRisk: z.string().nullable().default(null),
  recommendedEngineeringAction: z.string().nullable().default(null),
  recommendedQaAction: z.string().nullable().default(null),

  // BotCity and external automation compatibility fields
  externalTaskId: z.string().optional(),
  automationLabel: z.string().optional(),
  runnerId: z.string().optional(),
  externalTaskStatus: z.string().optional(),
  processedItemCount: z.number().optional(),

  // Spec auditing support
  workflowSpecVersion: z.string().default("1.0.0"),
  workflowSpecId: z.string().nullable().default(null),
  workflowSpecHash: z.string().nullable().default(null),

  executionStatus: executionStatusSchema.default("running"),
  evaluationStatus: evaluationStatusSchema.default("pending"),
  completionClientId: z.string().nullable().optional(),
});
export type BotRun = z.infer<typeof botRunSchema>;

export const artifactTypeSchema = z.enum([
  "screenshot",
  "json_snapshot",
  "error_trace",
  "ocr_output",
  "structured_log",
]);
export type ArtifactType = z.infer<typeof artifactTypeSchema>;

// Enforce redacted: true for incoming artifacts (Correction #8)
export const runArtifactSchema = z.object({
  id: z.string(),
  runId: z.string(),
  artifactType: artifactTypeSchema,
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  storageKey: z.string(),
  sha256: z.string(),
  redacted: z.literal(true),
  createdAt: z.string(),
  eventId: z.string().optional(),
});
export type RunArtifact = z.infer<typeof runArtifactSchema>;

// A separate type to allow redacted: boolean for stored artifacts
export const runArtifactStoredSchema = runArtifactSchema.extend({
  redacted: z.boolean(),
});
export type RunArtifactStored = z.infer<typeof runArtifactStoredSchema>;

export const ARTIFACT_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB Limit
export const ARTIFACT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/json",
  "text/plain",
  "text/csv",
] as const;

export const workflowSpecSchema = z.object({
  specVersion: z.string(),
  workflowType: workflowTypeSchema,
  pmsType: pmsTypeSchema,
  requiredScreens: z.array(z.string()),
  requiredStepOrder: z.array(z.string()),
  requiredFields: z.array(z.string()),
  stopConditions: z.array(z.string()),
  handoffConditions: z.array(z.string()),
  allowedRetries: z.number(),
  latencyThresholdMs: z.number(),
  confidenceThreshold: z.number(),
  uiFingerprints: z.record(z.string()),
  expectedButtons: z.array(z.string()),
  expectedTerminalOutcomes: z.array(z.string()),
});
export type WorkflowSpec = z.infer<typeof workflowSpecSchema>;


export const eventActionTypeSchema = z.enum([
  "screen_read",
  "field_extract",
  "field_entry",
  "click",
  "navigation",
  "validation",
  "exception",
  "human_handoff",
]);
export type EventActionType = z.infer<typeof eventActionTypeSchema>;

export const eventStatusSchema = z.enum(["success", "warning", "failed"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const botRunEventSchema = z.object({
  id: z.string(),
  botRunId: z.string(),
  stepNumber: z.number(),
  timestamp: z.string(),
  screenName: z.string(),
  actionType: eventActionTypeSchema,
  actionSummary: z.string(),
  extractedFields: z.record(z.unknown()).optional(),
  enteredFields: z.record(z.unknown()).optional(),
  confidence: z.number(),
  durationMs: z.number(),
  screenshotRef: z.string().optional(),
  status: eventStatusSchema,
  eventSchemaVersion: z.string().default(EVENT_SCHEMA_VERSION),
  receivedAt: z.string().optional(),
  clientEventId: z.string().optional(),
  screenText: z.string().optional(),
  domSnapshot: z.record(z.unknown()).optional(),
  uiFingerprint: z.string().optional(),
  beforeStateHash: z.string().optional(),
  afterStateHash: z.string().optional(),
  expectedNextAction: z.string().optional(),
  actualNextAction: z.string().optional(),
});
export type BotRunEvent = z.infer<typeof botRunEventSchema>;

export const evaluatorNameSchema = z.enum([
  "field_accuracy",
  "workflow_compliance",
  "exception_handling",
  "ui_drift",
  "loop_stall_detection",
  "latency",
  "regression",
]);
export type EvaluatorName = z.infer<typeof evaluatorNameSchema>;

export const evaluatorStatusSchema = z.enum(["passed", "warning", "failed"]);
export type EvaluatorStatus = z.infer<typeof evaluatorStatusSchema>;

export const severitySchema = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof severitySchema>;

export const deductionReasonSchema = z.object({
  label: z.string(),
  points: z.number(),
});
export type DeductionReason = z.infer<typeof deductionReasonSchema>;

export const evaluatorResultSchema = z.object({
  id: z.string(),
  botRunId: z.string(),
  evaluatorName: evaluatorNameSchema,
  score: z.number(),
  status: evaluatorStatusSchema,
  severity: severitySchema,
  findings: z.array(z.string()),
  recommendedAction: z.string(),
  evidenceEventIds: z.array(z.string()),
  deductionReasons: z.array(deductionReasonSchema).default([]),
  evaluatorVersion: z.string().default(EVALUATOR_VERSION),
});
export type EvaluatorResult = z.infer<typeof evaluatorResultSchema>;

export const fieldComparisonSchema = z.object({
  id: z.string(),
  botRunId: z.string(),
  fieldName: z.string(),
  expectedValue: z.string().nullable(),
  actualValue: z.string().nullable(),
  match: z.boolean(),
  severity: severitySchema,
});
export type FieldComparison = z.infer<typeof fieldComparisonSchema>;

export const regressionBaselineSchema = z.object({
  id: z.string(),
  workflowType: workflowTypeSchema,
  botVersion: z.string(),
  passRate: z.number(),
  averageLatencyMs: z.number(),
  averageScore: z.number(),
  failureCount: z.number(),
  completionRate: z.number(),
  knownExceptionTypes: z.array(z.string()).default([]),
  capturedAt: z.string(),
});
export type RegressionBaseline = z.infer<typeof regressionBaselineSchema>;

export const qaReviewActionTypeSchema = z.enum([
  "approve_for_automation",
  "hold_for_review",
  "block_automation",
  "flag_regression",
  "flag_drift",
  "assign_reviewer",
]);
export type QaReviewActionType = z.infer<typeof qaReviewActionTypeSchema>;

export const qaReviewActionSchema = z.object({
  id: z.string(),
  botRunId: z.string(),
  reviewerName: z.string(),
  action: qaReviewActionTypeSchema,
  note: z.string().default(""),
  createdAt: z.string(),
});
export type QaReviewAction = z.infer<typeof qaReviewActionSchema>;

export const botRunSummarySchema = z.object({
  botRunId: z.string(),
  summary: z.string(),
  reviewerNote: z.string(),
  engineeringExplanation: z.string(),
  usedLlm: z.boolean(),
  createdAt: z.string(),
});
export type BotRunSummary = z.infer<typeof botRunSummarySchema>;

export const botOpsAuditLogSchema = z.object({
  id: z.string(),
  botRunId: z.string().nullable(),
  actorType: z.enum(["system", "evaluator", "human", "import"]),
  actorName: z.string(),
  action: z.string(),
  details: z.record(z.unknown()).default({}),
  createdAt: z.string(),
});
export type BotOpsAuditLog = z.infer<typeof botOpsAuditLogSchema>;

export const botRunImportSchema = z.object({
  runNumber: z.string().min(1),
  pharmacyId: z.string().min(1),
  pharmacyName: z.string().min(1),
  pmsType: pmsTypeSchema,
  workflowType: workflowTypeSchema,
  botVersion: z.string().min(1),
  environment: environmentSchema.default("demo"),
  baselineVersion: z.string().optional(),
  workflowConfig: z
    .object({
      requiredSteps: z.array(z.string()).optional(),
      latencyThresholdMs: z.number().optional(),
      confidenceThreshold: z.number().optional(),
    })
    .optional(),
  events: z.array(
    z.object({
      stepNumber: z.number(),
      timestamp: z.string(),
      screenName: z.string(),
      actionType: eventActionTypeSchema,
      actionSummary: z.string(),
      extractedFields: z.record(z.unknown()).optional(),
      enteredFields: z.record(z.unknown()).optional(),
      confidence: z.number(),
      durationMs: z.number(),
      screenshotRef: z.string().optional(),
      status: eventStatusSchema,
    })
  ),
  expectedFields: z.record(z.string()).default({}),
  enteredFields: z.record(z.string()).default({}),
  workflowSpecVersion: z.string().optional(),
});
export type BotRunImport = z.infer<typeof botRunImportSchema>;

export interface BotRunDetail extends BotRun {
  events: BotRunEvent[];
  evaluatorResults: EvaluatorResult[];
  fieldComparisons: FieldComparison[];
  qaReviewActions: QaReviewAction[];
  auditLogs: BotOpsAuditLog[];
  summary: BotRunSummary | null;
  baseline: RegressionBaseline | null;
  artifacts: RunArtifact[];
}

export interface BotRunFilters {
  status?: string;
  riskLevel?: string;
  decision?: string;
  workflowType?: string;
  pmsType?: string;
  botVersion?: string;
  search?: string;
  needsReview?: boolean;
}

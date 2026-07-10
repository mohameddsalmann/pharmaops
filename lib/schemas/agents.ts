import { z } from "zod";

export const extractedPrescriptionSchema = z.object({
  patientName: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  medicationName: z.string().nullable(),
  strength: z.string().nullable(),
  directions: z.string().nullable(),
  quantity: z.number().nullable(),
  refills: z.number().nullable(),
  prescriberName: z.string().nullable(),
  sourceType: z.enum(["fax", "erx", "provider_portal", "manual"]),
  extractionConfidence: z.number(),
  missingFields: z.array(z.string()),
  rawNotes: z.array(z.string()),
});
export type ExtractedPrescription = z.infer<typeof extractedPrescriptionSchema>;

export const validationResultSchema = z.object({
  isComplete: z.boolean(),
  validationConfidence: z.number(),
  missingRequiredFields: z.array(z.string()),
  warnings: z.array(z.string()),
  blockingIssues: z.array(z.string()),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;

export const identityMatchResultSchema = z.object({
  nameMatch: z.boolean().nullable(),
  dobMatch: z.boolean().nullable(),
  insuranceMatch: z.boolean().nullable(),
  mismatchFields: z.array(z.string()),
  confidence: z.number(),
  reason: z.string(),
});
export type IdentityMatchResult = z.infer<typeof identityMatchResultSchema>;

export const insuranceTriageResultSchema = z.object({
  priorAuthorizationRequired: z.boolean(),
  insuranceIssueDetected: z.boolean(),
  reason: z.string(),
  evidenceSource: z.string().nullable(),
  confidence: z.number(),
});
export type InsuranceTriageResult = z.infer<typeof insuranceTriageResultSchema>;

export const complianceFlagSchema = z.object({
  type: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string(),
  evidenceSource: z.string(),
  evidenceSnippet: z.string(),
});
export type ComplianceFlag = z.infer<typeof complianceFlagSchema>;

export const complianceEvidenceResultSchema = z.object({
  flags: z.array(complianceFlagSchema),
  confidence: z.number(),
});
export type ComplianceEvidenceResult = z.infer<
  typeof complianceEvidenceResultSchema
>;

export const exceptionTypeSchema = z.enum([
  "missing_required_field",
  "low_confidence",
  "identity_mismatch",
  "prior_authorization_required",
  "insurance_conflict",
  "safety_review_required",
  "communication_approval_required",
  "none",
]);
export type ExceptionType = z.infer<typeof exceptionTypeSchema>;

export const severitySchema = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof severitySchema>;

export const exceptionItemSchema = z.object({
  id: z.string(),
  type: exceptionTypeSchema,
  severity: severitySchema,
  reason: z.string(),
  recommendedAction: z.string(),
  confidence: z.number(),
  evidenceSource: z.string().optional(),
});
export type ExceptionItem = z.infer<typeof exceptionItemSchema>;

export const exceptionClassificationResultSchema = z.object({
  exceptions: z.array(exceptionItemSchema),
  highestSeverity: z.enum(["low", "medium", "high", "critical", "none"]),
  requiresHumanReview: z.boolean(),
});
export type ExceptionClassificationResult = z.infer<
  typeof exceptionClassificationResultSchema
>;

export const supervisorDecisionSchema = z.object({
  decision: z.enum([
    "approved",
    "needs_human_review",
    "missing_information",
    "prior_authorization_required",
    "rejected",
    "cannot_determine",
  ]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number(),
  summary: z.string(),
  nextAction: z.string(),
  reasons: z.array(z.string()),
  evidenceUsed: z.array(z.string()),
});
export type SupervisorDecision = z.infer<typeof supervisorDecisionSchema>;

export const patientMessageDraftSchema = z.object({
  id: z.string().optional(),
  caseId: z.string(),
  messageType: z.enum([
    "missing_information",
    "prior_authorization",
    "review_pending",
    "refill_status",
    "general_update",
  ]),
  channel: z.enum(["sms", "call_script", "email"]),
  body: z.string(),
  requiresHumanApproval: z.boolean(),
  safetyNotes: z.array(z.string()),
});
export type PatientMessageDraft = z.infer<typeof patientMessageDraftSchema>;

export const agentRunSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  agentName: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).nullable(),
  confidence: z.number().nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  error: z.string().nullable(),
  usedFallback: z.boolean().default(false),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  latencyMs: z.number().nullable(),
});
export type AgentRun = z.infer<typeof agentRunSchema>;

export const evidenceItemSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  sourceTitle: z.string(),
  sourceType: z.string(),
  snippet: z.string(),
  relevanceScore: z.number(),
  usedByAgent: z.string(),
  createdAt: z.string(),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

import { z } from "zod";

export const sourceTypeSchema = z.enum([
  "fax",
  "erx",
  "provider_portal",
  "manual",
]);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const patientProfileSchema = z.object({
  name: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  insuranceMemberId: z.string().nullable(),
});
export type PatientProfile = z.infer<typeof patientProfileSchema>;

export const insuranceProfileSchema = z.object({
  planName: z.string().nullable(),
  memberId: z.string().nullable(),
  groupNumber: z.string().nullable(),
  priorAuthRequiredMeds: z.array(z.string()).default([]),
  quantityLimits: z
    .object({
      medication: z.string(),
      maxQuantity: z.number(),
    })
    .array()
    .default([]),
  active: z.boolean().default(true),
});
export type InsuranceProfile = z.infer<typeof insuranceProfileSchema>;

export const caseStatusSchema = z.enum([
  "pending_qa",
  "approved",
  "needs_human_review",
  "missing_information",
  "prior_authorization_required",
  "rejected",
  "cannot_determine",
  "in_review",
]);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const caseSchema = z.object({
  id: z.string(),
  caseNumber: z.string(),
  sourceType: sourceTypeSchema,
  status: caseStatusSchema,
  riskLevel: riskLevelSchema.nullable(),
  riskScore: z.number().nullable(),
  finalDecision: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  assignedReviewer: z.string().nullable(),
  qaRunInProgress: z.boolean().default(false),
});
export type Case = z.infer<typeof caseSchema>;

export const prescriptionInputSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  prescriptionText: z.string(),
  patientProfile: patientProfileSchema,
  insuranceProfile: insuranceProfileSchema,
  createdAt: z.string(),
});
export type PrescriptionInput = z.infer<typeof prescriptionInputSchema>;

export const createCaseBodySchema = z.object({
  sourceType: sourceTypeSchema,
  prescriptionText: z.string().min(1),
  patientProfile: patientProfileSchema,
  insuranceProfile: insuranceProfileSchema,
});

export const caseFiltersSchema = z.object({
  status: z.string().optional(),
  riskLevel: z.string().optional(),
  decision: z.string().optional(),
  search: z.string().optional(),
});

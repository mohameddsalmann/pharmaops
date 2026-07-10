import type {
  ExtractedPrescription,
  ValidationResult,
  IdentityMatchResult,
  InsuranceTriageResult,
  ComplianceEvidenceResult,
  ExceptionItem,
  ExceptionClassificationResult,
} from "@/lib/schemas/agents";
import { generateId } from "@/lib/utils/id";
import { generateStructured, LLMError } from "@/lib/ai/generate-structured";
import { z } from "zod";

export interface ExceptionAgentInput {
  extraction: ExtractedPrescription;
  validation: ValidationResult;
  identity: IdentityMatchResult;
  insurance: InsuranceTriageResult;
  compliance: ComplianceEvidenceResult;
}

export interface ExceptionAgentResult {
  output: ExceptionClassificationResult;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

const severityOrder = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

function highestSeverity(exceptions: ExceptionItem[]): "low" | "medium" | "high" | "critical" | "none" {
  if (exceptions.length === 0) return "none";
  let max: "low" | "medium" | "high" | "critical" = "low";
  for (const e of exceptions) {
    if (severityOrder[e.severity] > severityOrder[max]) max = e.severity;
  }
  return max;
}

function deterministicClassify(input: ExceptionAgentInput): ExceptionItem[] {
  const items: ExceptionItem[] = [];
  const { extraction, validation, identity, insurance, compliance } = input;

  for (const field of validation.missingRequiredFields) {
    const isCritical = ["medicationName", "directions", "dateOfBirth"].includes(field);
    items.push({
      id: generateId(),
      type: "missing_required_field",
      severity: isCritical ? "critical" : "high",
      reason: `Required field "${field}" is missing from the prescription`,
      recommendedAction: isCritical
        ? "Route to human review — critical field missing"
        : "Contact prescriber to obtain missing information",
      confidence: 0.9,
      evidenceSource: "prescription-intake-sop.md",
    });
  }

  if (extraction.extractionConfidence < 0.75) {
    items.push({
      id: generateId(),
      type: "low_confidence",
      severity: "high",
      reason: `Extraction confidence is ${extraction.extractionConfidence.toFixed(2)}, below the 0.75 threshold`,
      recommendedAction: "Route to human review for manual verification",
      confidence: 0.85,
      evidenceSource: "prescription-intake-sop.md",
    });
  }

  if (identity.dobMatch === false) {
    items.push({
      id: generateId(),
      type: "identity_mismatch",
      severity: "critical",
      reason: "DOB mismatch between prescription and patient profile",
      recommendedAction: "Route to human review immediately — DOB mismatch is a critical safety concern",
      confidence: 0.95,
      evidenceSource: "patient-identity-verification.md",
    });
  }

  if (identity.nameMatch === false) {
    items.push({
      id: generateId(),
      type: "identity_mismatch",
      severity: "high",
      reason: "Patient name mismatch between prescription and patient profile",
      recommendedAction: "Route to human review for identity verification",
      confidence: 0.9,
      evidenceSource: "patient-identity-verification.md",
    });
  }

  if (insurance.priorAuthorizationRequired) {
    items.push({
      id: generateId(),
      type: "prior_authorization_required",
      severity: "medium",
      reason: insurance.reason,
      recommendedAction: "Route to prior authorization team",
      confidence: 0.9,
      evidenceSource: insurance.evidenceSource ?? "insurance-prior-auth-rules.md",
    });
  }

  if (insurance.insuranceIssueDetected && !insurance.priorAuthorizationRequired) {
    items.push({
      id: generateId(),
      type: "insurance_conflict",
      severity: "medium",
      reason: insurance.reason,
      recommendedAction: "Flag for staff review of insurance information",
      confidence: 0.85,
      evidenceSource: "insurance-prior-auth-rules.md",
    });
  }

  for (const flag of compliance.flags) {
    if (flag.type === "safety_review_required") {
      items.push({
        id: generateId(),
        type: "safety_review_required",
        severity: flag.severity,
        reason: flag.reason,
        recommendedAction: "Route to pharmacist for safety review",
        confidence: 0.9,
        evidenceSource: flag.evidenceSource,
      });
    }
  }

  return items;
}

const llmRewriteSchema = z.object({
  exceptions: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
      recommendedAction: z.string(),
    })
  ),
});

const SYSTEM_PROMPT = `You are an AI QA agent for a synthetic pharmacy automation demo.

Your job is to write clear, professional reason and recommended action text for exceptions detected by the deterministic system.

You must not change the exception type, severity, or confidence.
You must not provide medical advice.
You must not approve clinical decisions.

Return only valid JSON matching the required schema.`;

export async function runExceptionAgent(input: ExceptionAgentInput): Promise<ExceptionAgentResult> {
  const startTime = Date.now();
  const deterministicExceptions = deterministicClassify(input);

  const hs = highestSeverity(deterministicExceptions);
  const requiresHumanReview = hs === "critical" || hs === "high";

  const baseResult: ExceptionClassificationResult = {
    exceptions: deterministicExceptions,
    highestSeverity: hs,
    requiresHumanReview,
  };

  if (deterministicExceptions.length === 0) {
    return {
      output: baseResult,
      confidence: 0.95,
      usedFallback: false,
      provider: null,
      model: null,
      latencyMs: 0,
      error: null,
    };
  }

  try {
    const exceptionSummary = deterministicExceptions.map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      currentReason: e.reason,
      currentAction: e.recommendedAction,
    }));

    const result = await generateStructured<z.infer<typeof llmRewriteSchema>>({
      schema: llmRewriteSchema,
      system: SYSTEM_PROMPT,
      prompt: `Rewrite the reason and recommendedAction text for these exceptions to be more professional and clear:\n\n${JSON.stringify(exceptionSummary, null, 2)}\n\nReturn JSON with: { exceptions: [{ id, reason, recommendedAction }] }`,
    });

    const rewrittenMap = new Map(result.data.exceptions.map((r) => [r.id, r]));
    const finalExceptions = deterministicExceptions.map((e) => {
      const rewritten = rewrittenMap.get(e.id);
      if (rewritten) {
        return {
          ...e,
          reason: rewritten.reason,
          recommendedAction: rewritten.recommendedAction,
        };
      }
      return e;
    });

    return {
      output: { ...baseResult, exceptions: finalExceptions },
      confidence: 0.9,
      usedFallback: false,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      error: null,
    };
  } catch (err) {
    return {
      output: baseResult,
      confidence: 0.85,
      usedFallback: true,
      provider: null,
      model: null,
      latencyMs: Date.now() - startTime,
      error: err instanceof LLMError ? err.message : "LLM unavailable, using deterministic fallback",
    };
  }
}

import type {
  ExtractedPrescription,
  ValidationResult,
  IdentityMatchResult,
  InsuranceTriageResult,
  ComplianceEvidenceResult,
  ExceptionClassificationResult,
  SupervisorDecision,
} from "@/lib/schemas/agents";
import type { RiskScoreResult } from "@/lib/scoring/risk-score";
import { generateStructured, LLMError } from "@/lib/ai/generate-structured";
import { z } from "zod";

export interface SupervisorAgentInput {
  extraction: ExtractedPrescription;
  validation: ValidationResult;
  identity: IdentityMatchResult;
  insurance: InsuranceTriageResult;
  compliance: ComplianceEvidenceResult;
  exceptions: ExceptionClassificationResult;
  riskScore: RiskScoreResult;
}

export interface SupervisorAgentResult {
  output: SupervisorDecision;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

function deterministicDecide(input: SupervisorAgentInput): SupervisorDecision {
  const { exceptions, riskScore, identity, extraction, insurance } = input;
  const reasons: string[] = [];
  const evidenceUsed: string[] = [];

  let decision: SupervisorDecision["decision"] = "needs_human_review";
  let nextAction = "Route to human review for further evaluation";

  if (riskScore.level === "critical") {
    decision = "needs_human_review";
    reasons.push("Critical risk level detected");
    nextAction = "Route to human review immediately — critical risk";
  } else if (identity.dobMatch === false) {
    decision = "needs_human_review";
    reasons.push("DOB mismatch requires human review");
    nextAction = "Route to human review for DOB verification";
  } else if (!extraction.medicationName || !extraction.directions) {
    decision = "missing_information";
    reasons.push("Missing medication or directions");
    nextAction = "Contact prescriber to obtain missing information";
  } else if (insurance.priorAuthorizationRequired) {
    decision = "prior_authorization_required";
    reasons.push("Prior authorization required");
    nextAction = "Route to prior authorization team";
  } else if (extraction.extractionConfidence < 0.75) {
    decision = "needs_human_review";
    reasons.push("Low extraction confidence requires human review");
    nextAction = "Route to human review for manual verification";
  } else if (riskScore.score >= 90 && !exceptions.requiresHumanReview) {
    decision = "approved";
    reasons.push("All checks passed, risk score is high");
    nextAction = "Proceed with processing";
  } else {
    decision = "needs_human_review";
    reasons.push("Case does not meet approval criteria");
    nextAction = "Route to human review for further evaluation";
  }

  for (const d of riskScore.deductions) {
    evidenceUsed.push(`Risk deduction: ${d.label} (-${d.points})`);
  }
  for (const e of exceptions.exceptions) {
    if (e.evidenceSource) evidenceUsed.push(e.evidenceSource);
  }

  const summary = `Decision: ${decision}. Risk score: ${riskScore.score} (${riskScore.level}). ${reasons.join(". ")}.`;

  return {
    decision,
    riskLevel: riskScore.level,
    confidence: riskScore.score / 100,
    summary,
    nextAction,
    reasons,
    evidenceUsed: [...new Set(evidenceUsed)],
  };
}

const llmSummarySchema = z.object({
  summary: z.string(),
  reasons: z.array(z.string()),
});

const SYSTEM_PROMPT = `You are an AI QA agent for a synthetic pharmacy automation demo.

Your job is to write a clear, professional summary and reasons for a supervisor decision that has ALREADY been made deterministically.

You must NOT change the decision, risk level, risk score, severity, or confidence.
You must NOT approve clinical decisions.
You must NOT provide medical advice.
You may only rephrase the summary and reasons for readability.

Return only valid JSON matching the required schema.`;

export async function runSupervisorAgent(input: SupervisorAgentInput): Promise<SupervisorAgentResult> {
  const startTime = Date.now();
  const deterministic = deterministicDecide(input);

  try {
    const result = await generateStructured<z.infer<typeof llmSummarySchema>>({
      schema: llmSummarySchema,
      system: SYSTEM_PROMPT,
      prompt: `The deterministic supervisor has made this decision:\n\nDecision: ${deterministic.decision}\nRisk Level: ${deterministic.riskLevel}\nRisk Score: ${input.riskScore.score}\nNext Action: ${deterministic.nextAction}\nDeductions: ${JSON.stringify(input.riskScore.deductions)}\nExceptions: ${JSON.stringify(input.exceptions.exceptions.map((e) => ({ type: e.type, severity: e.severity, reason: e.reason })))}\n\nWrite a professional summary (2-3 sentences) and clear reasons array. Do NOT change the decision or risk level.\n\nReturn JSON with: { summary: string, reasons: string[] }`,
    });

    return {
      output: {
        ...deterministic,
        summary: result.data.summary,
        reasons: result.data.reasons,
      },
      confidence: deterministic.confidence,
      usedFallback: false,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      error: null,
    };
  } catch (err) {
    return {
      output: deterministic,
      confidence: deterministic.confidence,
      usedFallback: true,
      provider: null,
      model: null,
      latencyMs: Date.now() - startTime,
      error: err instanceof LLMError ? err.message : "LLM unavailable, using deterministic fallback",
    };
  }
}

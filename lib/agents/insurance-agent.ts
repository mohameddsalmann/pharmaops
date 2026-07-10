import type { ExtractedPrescription, InsuranceTriageResult } from "@/lib/schemas/agents";
import type { InsuranceProfile } from "@/lib/schemas/case";
import { isPriorAuthMed, checkQuantityLimit } from "@/lib/mock/sample-insurance";

export interface InsuranceAgentInput {
  extraction: ExtractedPrescription;
  insuranceProfile: InsuranceProfile;
}

export interface InsuranceAgentResult {
  output: InsuranceTriageResult;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

export function runInsuranceAgent(input: InsuranceAgentInput): InsuranceAgentResult {
  const { extraction, insuranceProfile } = input;
  const reasons: string[] = [];
  let priorAuth = false;
  let issueDetected = false;
  let evidenceSource: string | null = null;

  if (!insuranceProfile.active) {
    issueDetected = true;
    reasons.push("Insurance profile is inactive");
    evidenceSource = "insurance-prior-auth-rules.md";
  }

  if (isPriorAuthMed(extraction.medicationName)) {
    priorAuth = true;
    issueDetected = true;
    reasons.push(`Medication ${extraction.medicationName} requires prior authorization`);
    evidenceSource = "insurance-prior-auth-rules.md";
  }

  if (checkQuantityLimit(extraction.medicationName, extraction.quantity, insuranceProfile)) {
    priorAuth = true;
    issueDetected = true;
    reasons.push(`Quantity ${extraction.quantity} exceeds plan limit for ${extraction.medicationName}`);
    evidenceSource = "insurance-prior-auth-rules.md";
  }

  if (!insuranceProfile.memberId) {
    issueDetected = true;
    reasons.push("Insurance member ID is missing");
    evidenceSource = "insurance-prior-auth-rules.md";
  }

  const confidence = priorAuth ? 0.9 : issueDetected ? 0.8 : 0.95;

  return {
    output: {
      priorAuthorizationRequired: priorAuth,
      insuranceIssueDetected: issueDetected,
      reason: reasons.length > 0 ? reasons.join("; ") : "No insurance issues detected",
      evidenceSource,
      confidence,
    },
    confidence,
    usedFallback: false,
    provider: null,
    model: null,
    latencyMs: 0,
    error: null,
  };
}

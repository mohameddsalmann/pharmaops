import type { ExtractedPrescription } from "@/lib/schemas/agents";
import type { ValidationResult } from "@/lib/schemas/agents";
import type { IdentityMatchResult } from "@/lib/schemas/agents";
import type { InsuranceTriageResult } from "@/lib/schemas/agents";
import type { ComplianceEvidenceResult } from "@/lib/schemas/agents";
import type { RiskLevel } from "@/lib/schemas/case";

export interface RiskDeduction {
  label: string;
  points: number;
}

export interface RiskScoreResult {
  score: number;
  level: RiskLevel;
  deductions: RiskDeduction[];
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 90) return "low";
  if (score >= 70) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

export function computeRisk(
  extraction: ExtractedPrescription,
  _validation: ValidationResult,
  identity: IdentityMatchResult,
  insurance: InsuranceTriageResult,
  compliance: ComplianceEvidenceResult
): RiskScoreResult {
  let score = 100;
  const deductions: RiskDeduction[] = [];

  const deduct = (label: string, points: number) => {
    score -= points;
    deductions.push({ label, points });
  };

  if (!extraction.patientName) deduct("Missing patient name", 25);
  if (!extraction.dateOfBirth) deduct("Missing DOB", 25);
  if (identity.dobMatch === false) deduct("DOB mismatch", 40);
  if (!extraction.medicationName) deduct("Medication missing", 35);
  if (!extraction.strength) deduct("Strength missing", 25);
  if (!extraction.directions) deduct("Directions missing", 25);
  if (extraction.quantity === null) deduct("Quantity missing", 15);
  if (!extraction.prescriberName) deduct("Prescriber missing", 20);

  if (extraction.extractionConfidence < 0.75) {
    deduct("Extraction confidence below 0.75", 30);
  } else if (extraction.extractionConfidence < 0.9) {
    deduct("Extraction confidence between 0.75 and 0.89", 10);
  }

  if (insurance.priorAuthorizationRequired) {
    deduct("Prior authorization required", 15);
  }

  const hasHighFlag = compliance.flags.some((f) => f.severity === "high");
  const hasCriticalFlag = compliance.flags.some(
    (f) => f.severity === "critical"
  );

  if (hasCriticalFlag) {
    deduct("Safety/compliance flag critical", 50);
  } else if (hasHighFlag) {
    deduct("Safety/compliance flag high", 30);
  }

  if (score < 0) score = 0;

  return {
    score,
    level: riskLevelFromScore(score),
    deductions,
  };
}

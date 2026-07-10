import type { ExtractedPrescription, ValidationResult } from "@/lib/schemas/agents";

export interface ValidationAgentInput {
  extraction: ExtractedPrescription;
}

export interface ValidationAgentResult {
  output: ValidationResult;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

const REQUIRED_FIELDS = [
  "patientName",
  "dateOfBirth",
  "medicationName",
  "strength",
  "directions",
  "quantity",
  "prescriberName",
];

export function runValidationAgent(input: ValidationAgentInput): ValidationAgentResult {
  const { extraction } = input;
  const missing: string[] = [];
  const warnings: string[] = [];
  const blockingIssues: string[] = [];

  for (const field of REQUIRED_FIELDS) {
    const val = extraction[field as keyof ExtractedPrescription];
    if (val === null || val === undefined || val === "") {
      missing.push(field);
      if (["medicationName", "directions", "dateOfBirth"].includes(field)) {
        blockingIssues.push(`Missing critical field: ${field}`);
      } else {
        warnings.push(`Missing field: ${field}`);
      }
    }
  }

  if (extraction.refills !== null && extraction.refills < 0) {
    warnings.push("Refills count is negative");
  }

  const isComplete = missing.length === 0;
  const confidence = isComplete ? 0.95 : Math.max(0.3, 0.95 - missing.length * 0.1);

  return {
    output: {
      isComplete,
      validationConfidence: confidence,
      missingRequiredFields: missing,
      warnings,
      blockingIssues,
    },
    confidence,
    usedFallback: false,
    provider: null,
    model: null,
    latencyMs: 0,
    error: null,
  };
}

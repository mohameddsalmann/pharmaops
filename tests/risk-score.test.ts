import { describe, it, expect } from "vitest";
import { computeRisk, riskLevelFromScore } from "@/lib/scoring/risk-score";
import type { ExtractedPrescription, ValidationResult, IdentityMatchResult, InsuranceTriageResult, ComplianceEvidenceResult } from "@/lib/schemas/agents";

const baseExtraction: ExtractedPrescription = {
  patientName: "John Doe",
  dateOfBirth: "1985-03-15",
  medicationName: "Atorvastatin",
  strength: "20 mg",
  directions: "Take 1 tablet by mouth once daily",
  quantity: 30,
  refills: 3,
  prescriberName: "Dr. Emily Carter",
  sourceType: "erx",
  extractionConfidence: 0.95,
  missingFields: [],
  rawNotes: [],
};

const baseValidation: ValidationResult = {
  isComplete: true,
  validationConfidence: 0.95,
  missingRequiredFields: [],
  warnings: [],
  blockingIssues: [],
};

const baseIdentity: IdentityMatchResult = {
  nameMatch: true,
  dobMatch: true,
  insuranceMatch: true,
  mismatchFields: [],
  confidence: 0.95,
  reason: "All fields match",
};

const baseInsurance: InsuranceTriageResult = {
  priorAuthorizationRequired: false,
  insuranceIssueDetected: false,
  reason: "No issues",
  evidenceSource: null,
  confidence: 0.95,
};

const baseCompliance: ComplianceEvidenceResult = {
  flags: [],
  confidence: 0.95,
};

describe("riskLevelFromScore", () => {
  it("returns low for scores >= 90", () => {
    expect(riskLevelFromScore(90)).toBe("low");
    expect(riskLevelFromScore(100)).toBe("low");
  });

  it("returns medium for scores 70-89", () => {
    expect(riskLevelFromScore(70)).toBe("medium");
    expect(riskLevelFromScore(89)).toBe("medium");
  });

  it("returns high for scores 40-69", () => {
    expect(riskLevelFromScore(40)).toBe("high");
    expect(riskLevelFromScore(69)).toBe("high");
  });

  it("returns critical for scores < 40", () => {
    expect(riskLevelFromScore(39)).toBe("critical");
    expect(riskLevelFromScore(0)).toBe("critical");
  });
});

describe("computeRisk", () => {
  it("returns score 100 for a clean case", () => {
    const result = computeRisk(baseExtraction, baseValidation, baseIdentity, baseInsurance, baseCompliance);
    expect(result.score).toBe(100);
    expect(result.level).toBe("low");
    expect(result.deductions).toHaveLength(0);
  });

  it("deducts 40 for DOB mismatch", () => {
    const identity: IdentityMatchResult = { ...baseIdentity, dobMatch: false };
    const result = computeRisk(baseExtraction, baseValidation, identity, baseInsurance, baseCompliance);
    expect(result.score).toBe(60);
    expect(result.deductions.some((d) => d.label === "DOB mismatch" && d.points === 40)).toBe(true);
  });

  it("deducts for missing fields", () => {
    const extraction: ExtractedPrescription = { ...baseExtraction, patientName: null, medicationName: null };
    const result = computeRisk(extraction, baseValidation, baseIdentity, baseInsurance, baseCompliance);
    expect(result.score).toBe(40);
    expect(result.deductions.some((d) => d.label === "Missing patient name")).toBe(true);
    expect(result.deductions.some((d) => d.label === "Medication missing")).toBe(true);
  });

  it("deducts 30 for low extraction confidence", () => {
    const extraction: ExtractedPrescription = { ...baseExtraction, extractionConfidence: 0.6 };
    const result = computeRisk(extraction, baseValidation, baseIdentity, baseInsurance, baseCompliance);
    expect(result.score).toBe(70);
    expect(result.deductions.some((d) => d.label === "Extraction confidence below 0.75")).toBe(true);
  });

  it("deducts 15 for prior authorization", () => {
    const insurance: InsuranceTriageResult = { ...baseInsurance, priorAuthorizationRequired: true };
    const result = computeRisk(baseExtraction, baseValidation, baseIdentity, insurance, baseCompliance);
    expect(result.score).toBe(85);
  });

  it("deducts 50 for critical compliance flag", () => {
    const compliance: ComplianceEvidenceResult = {
      flags: [{ type: "missing_information", severity: "critical", reason: "test", evidenceSource: "sop", evidenceSnippet: "snippet" }],
      confidence: 0.85,
    };
    const result = computeRisk(baseExtraction, baseValidation, baseIdentity, baseInsurance, compliance);
    expect(result.score).toBe(50);
  });

  it("clamps score to 0 minimum", () => {
    const extraction: ExtractedPrescription = {
      ...baseExtraction,
      patientName: null,
      dateOfBirth: null,
      medicationName: null,
      strength: null,
      directions: null,
      quantity: null,
      prescriberName: null,
      extractionConfidence: 0.5,
    };
    const identity: IdentityMatchResult = { ...baseIdentity, dobMatch: false };
    const insurance: InsuranceTriageResult = { ...baseInsurance, priorAuthorizationRequired: true };
    const compliance: ComplianceEvidenceResult = {
      flags: [{ type: "safety", severity: "critical", reason: "test", evidenceSource: "sop", evidenceSnippet: "snippet" }],
      confidence: 0.5,
    };
    const result = computeRisk(extraction, baseValidation, identity, insurance, compliance);
    expect(result.score).toBe(0);
    expect(result.level).toBe("critical");
  });
});

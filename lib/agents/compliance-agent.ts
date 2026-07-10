import type { ExtractedPrescription, ComplianceEvidenceResult, ComplianceFlag } from "@/lib/schemas/agents";
import { retrieveEvidence, type RetrievedSnippet } from "@/lib/rag/retriever";
import { isHighReviewMed } from "@/lib/mock/sample-insurance";

export interface ComplianceAgentInput {
  extraction: ExtractedPrescription;
}

export interface ComplianceAgentResult {
  output: ComplianceEvidenceResult;
  evidence: RetrievedSnippet[];
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

export function runComplianceAgent(input: ComplianceAgentInput): ComplianceAgentResult {
  const { extraction } = input;
  const flags: ComplianceFlag[] = [];
  const keywords: string[] = [];

  if (isHighReviewMed(extraction.medicationName)) {
    keywords.push("high-review", "medication", "safety", "pharmacist");
    const evidence = retrieveEvidence(keywords, "compliance-agent");
    const snippet = evidence[0]?.snippet ?? "High-review medication requires pharmacist review per safety policy.";
    flags.push({
      type: "safety_review_required",
      severity: "high",
      reason: `Medication ${extraction.medicationName} is marked for pharmacist review per safety policy`,
      evidenceSource: "medication-safety-review-rules.md",
      evidenceSnippet: snippet,
    });
  }

  if (extraction.missingFields.includes("medicationName") || extraction.missingFields.includes("directions")) {
    keywords.push("missing", "medication", "directions", "review");
    const evidence = retrieveEvidence(keywords, "compliance-agent");
    const snippet = evidence[0]?.snippet ?? "Missing medication, directions, or DOB requires human review.";
    flags.push({
      type: "missing_information",
      severity: "critical",
      reason: "Critical missing fields detected requiring human review",
      evidenceSource: "prescription-intake-sop.md",
      evidenceSnippet: snippet,
    });
  }

  if (extraction.extractionConfidence < 0.75) {
    keywords.push("low", "confidence", "fax", "review");
    const evidence = retrieveEvidence(keywords, "compliance-agent");
    const snippet = evidence[0]?.snippet ?? "Low-confidence fax extractions must be routed to human review.";
    flags.push({
      type: "low_confidence",
      severity: "medium",
      reason: "Extraction confidence is below threshold, human review required",
      evidenceSource: "prescription-intake-sop.md",
      evidenceSnippet: snippet,
    });
  }

  const allEvidence = keywords.length > 0 ? retrieveEvidence(keywords, "compliance-agent") : [];
  const confidence = flags.length === 0 ? 0.95 : 0.85;

  return {
    output: { flags, confidence },
    evidence: allEvidence,
    confidence,
    usedFallback: false,
    provider: null,
    model: null,
    latencyMs: 0,
    error: null,
  };
}

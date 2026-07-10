import type { ExtractedPrescription, IdentityMatchResult } from "@/lib/schemas/agents";
import type { PatientProfile } from "@/lib/schemas/case";

export interface IdentityAgentInput {
  extraction: ExtractedPrescription;
  patientProfile: PatientProfile;
}

export interface IdentityAgentResult {
  output: IdentityMatchResult;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

function namesMatch(a: string | null, b: string | null): boolean | null {
  if (!a || !b) return null;
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  return norm(a) === norm(b);
}

function dobsMatch(a: string | null, b: string | null): boolean | null {
  if (!a || !b) return null;
  const norm = (s: string) => s.trim().replace(/-/g, "/");
  return norm(a) === norm(b);
}

function insuranceMatch(a: string | null, b: string | null): boolean | null {
  if (!a || !b) return null;
  return a.trim() === b.trim();
}

export function runIdentityAgent(input: IdentityAgentInput): IdentityAgentResult {
  const { extraction, patientProfile } = input;
  const mismatchFields: string[] = [];

  const nm = namesMatch(extraction.patientName, patientProfile.name);
  const dm = dobsMatch(extraction.dateOfBirth, patientProfile.dateOfBirth);
  const im = insuranceMatch(null, patientProfile.insuranceMemberId);

  if (nm === false) mismatchFields.push("patientName");
  if (dm === false) mismatchFields.push("dateOfBirth");
  if (im === false) mismatchFields.push("insuranceMemberId");

  let confidence = 0.9;
  if (dm === false) confidence = 0.4;
  else if (nm === false) confidence = 0.5;
  else if (dm === null) confidence = 0.6;

  const reasons: string[] = [];
  if (dm === false) reasons.push("DOB mismatch detected between prescription and patient profile");
  if (nm === false) reasons.push("Patient name mismatch");
  if (dm === null) reasons.push("DOB missing, cannot verify identity");
  if (reasons.length === 0) reasons.push("Identity verification passed");

  return {
    output: {
      nameMatch: nm,
      dobMatch: dm,
      insuranceMatch: im,
      mismatchFields,
      confidence,
      reason: reasons.join("; "),
    },
    confidence,
    usedFallback: false,
    provider: null,
    model: null,
    latencyMs: 0,
    error: null,
  };
}

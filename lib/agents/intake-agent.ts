import { extractedPrescriptionSchema, type ExtractedPrescription } from "@/lib/schemas/agents";
import { generateStructured, LLMError } from "@/lib/ai/generate-structured";
import type { SourceType } from "@/lib/schemas/case";

export interface IntakeAgentInput {
  prescriptionText: string;
  sourceType: SourceType;
}

export interface IntakeAgentResult {
  output: ExtractedPrescription;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

const SYSTEM_PROMPT = `You are an AI QA agent for a synthetic pharmacy automation demo.

Your job is to extract structured prescription fields from raw prescription text.

You must not provide medical advice.
You must not invent missing data. If a field is unclear or missing, return null and add it to missingFields.
If confidence is low, reflect that in extractionConfidence.

Return only valid JSON matching the required schema.`;

function deterministicExtract(text: string, sourceType: SourceType): ExtractedPrescription {
  const lines = text.split("\n").map((l) => l.trim());
  const missingFields: string[] = [];
  const rawNotes: string[] = [];

  const findField = (labels: string[]): string | null => {
    for (const line of lines) {
      for (const label of labels) {
        if (line.toLowerCase().startsWith(label.toLowerCase())) {
          const val = line.substring(label.length).replace(/^[:\s]+/, "").trim();
          if (val && val !== "?" && !val.includes("???") && !val.includes("illegible") && !val.includes("smudged") && !val.includes("unclear") && !val.includes("degraded")) {
            return val;
          }
        }
      }
    }
    return null;
  };

  const patientName = findField(["Patient", "Pt"]);
  const dateOfBirth = findField(["DOB", "Date of Birth"]);
  const medicationName = findField(["Medication", "Rx"]);
  const strength = findField(["Strength", "Str"]);
  const directions = findField(["Sig", "Directions"]);
  const qtyStr = findField(["Qty", "Quantity"]);
  const refillsStr = findField(["Refills"]);
  const prescriberName = findField(["Prescriber"]);

  const quantity = qtyStr ? parseInt(qtyStr.replace(/[^0-9]/g, ""), 10) || null : null;
  const refills = refillsStr ? parseInt(refillsStr.replace(/[^0-9]/g, ""), 10) : null;

  for (const line of lines) {
    if (line.toLowerCase().startsWith("pharmacy notes") || line.toLowerCase().startsWith("notes")) {
      const note = line.replace(/^.*notes?:?\s*/i, "").trim();
      if (note) rawNotes.push(note);
    }
  }

  const fields: Record<string, string | number | null> = {
    patientName,
    dateOfBirth,
    medicationName,
    strength,
    directions,
    quantity,
    refills,
    prescriberName,
  };

  for (const [key, val] of Object.entries(fields)) {
    if (val === null || val === undefined || val === "") {
      missingFields.push(key);
    }
  }

  const isMessyFax = sourceType === "fax" && (text.includes("illegible") || text.includes("???") || text.includes("smudged") || text.includes("degraded") || text.includes("unclear"));
  const missingCount = missingFields.length;
  let confidence = 0.95;
  if (isMessyFax) confidence = 0.55;
  else if (missingCount >= 3) confidence = 0.6;
  else if (missingCount >= 1) confidence = 0.8;
  if (patientName && patientName.includes("???")) confidence = Math.min(confidence, 0.5);

  return {
    patientName: patientName ?? null,
    dateOfBirth: dateOfBirth ?? null,
    medicationName: medicationName ?? null,
    strength: strength ?? null,
    directions: directions ?? null,
    quantity: quantity ?? null,
    refills: refills ?? null,
    prescriberName: prescriberName ?? null,
    sourceType,
    extractionConfidence: confidence,
    missingFields,
    rawNotes,
  };
}

export async function runIntakeAgent(input: IntakeAgentInput): Promise<IntakeAgentResult> {
  const startTime = Date.now();

  try {
    const result = await generateStructured<ExtractedPrescription>({
      schema: extractedPrescriptionSchema,
      system: SYSTEM_PROMPT,
      prompt: `Extract prescription fields from this text:\n\n${input.prescriptionText}\n\nSource type: ${input.sourceType}\n\nReturn JSON with: patientName, dateOfBirth, medicationName, strength, directions, quantity (number), refills (number), prescriberName, sourceType ("${input.sourceType}"), extractionConfidence (0-1), missingFields (array of field names that are null/missing), rawNotes (array of pharmacy notes).`,
    });

    return {
      output: result.data,
      confidence: result.data.extractionConfidence,
      usedFallback: false,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      error: null,
    };
  } catch (err) {
    const fallback = deterministicExtract(input.prescriptionText, input.sourceType);
    return {
      output: fallback,
      confidence: fallback.extractionConfidence,
      usedFallback: true,
      provider: null,
      model: null,
      latencyMs: Date.now() - startTime,
      error: err instanceof LLMError ? err.message : "LLM unavailable, using deterministic fallback",
    };
  }
}

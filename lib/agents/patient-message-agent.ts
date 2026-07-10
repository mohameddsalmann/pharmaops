import type { PatientMessageDraft, SupervisorDecision, ExtractedPrescription } from "@/lib/schemas/agents";
import { patientMessageDraftSchema } from "@/lib/schemas/agents";
import { generateStructured, LLMError } from "@/lib/ai/generate-structured";

export interface PatientMessageAgentInput {
  caseId: string;
  decision: SupervisorDecision;
  extraction: ExtractedPrescription;
  patientName: string | null;
  caseStatus: string;
}

export interface PatientMessageAgentResult {
  output: PatientMessageDraft;
  confidence: number;
  usedFallback: boolean;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  error: string | null;
}

function deterministicDraft(input: PatientMessageAgentInput): PatientMessageDraft {
  const { decision, patientName } = input;
  const name = patientName ?? "Patient";

  let messageType: PatientMessageDraft["messageType"] = "general_update";
  let body = "";

  switch (decision.decision) {
    case "approved":
      messageType = "refill_status";
      body = `Hello ${name}, your prescription has been processed and is ready for pickup. Please contact the pharmacy if you have any questions.`;
      break;
    case "needs_human_review":
      messageType = "review_pending";
      body = `Hello ${name}, a pharmacist is currently reviewing your prescription. We will contact you once the review is complete. Thank you for your patience.`;
      break;
    case "missing_information":
      messageType = "missing_information";
      body = `Hello ${name}, we need additional information to process your prescription. Please contact the pharmacy at your earliest convenience.`;
      break;
    case "prior_authorization_required":
      messageType = "prior_authorization";
      body = `Hello ${name}, your prescription requires prior authorization from your insurance provider. We are working on this and will update you once approved.`;
      break;
    case "rejected":
      messageType = "general_update";
      body = `Hello ${name}, there is an update regarding your prescription. Please contact the pharmacy for more information.`;
      break;
    default:
      messageType = "general_update";
      body = `Hello ${name}, there is an update regarding your prescription. Please contact the pharmacy for more information.`;
  }

  return {
    caseId: input.caseId,
    messageType,
    channel: "sms",
    body,
    requiresHumanApproval: true,
    safetyNotes: ["Requires staff approval before sending.", "Do not send without pharmacist confirmation."],
  };
}

const SYSTEM_PROMPT = `You are an AI communication agent for a synthetic pharmacy automation demo.

Your job is to draft a patient message based on the case status.

Rules:
- Do not claim medication is approved unless the case status is "approved".
- Do not give medical advice.
- Do not mention sensitive details unnecessarily.
- Do not recommend treatment changes.
- The message must be professional and concise.
- requiresHumanApproval must always be true.

Return only valid JSON matching the required schema.`;

export async function runPatientMessageAgent(input: PatientMessageAgentInput): Promise<PatientMessageAgentResult> {
  const startTime = Date.now();
  const deterministic = deterministicDraft(input);

  try {
    const result = await generateStructured<PatientMessageDraft>({
      schema: patientMessageDraftSchema,
      system: SYSTEM_PROMPT,
      prompt: `Draft a patient message for this case:\n\nDecision: ${input.decision.decision}\nCase Status: ${input.caseStatus}\nPatient Name: ${input.patientName ?? "Unknown"}\nMedication: ${input.extraction.medicationName ?? "Unknown"}\n\nRules: Do not claim approved unless status is "approved". requiresHumanApproval must be true. Include safetyNotes array with "Requires staff approval before sending."\n\nReturn JSON with: messageType, channel, body, requiresHumanApproval (must be true), safetyNotes (array of strings).`,
    });

    return {
      output: {
        ...result.data,
        caseId: input.caseId,
        requiresHumanApproval: true,
        safetyNotes: result.data.safetyNotes.length > 0 ? result.data.safetyNotes : ["Requires staff approval before sending."],
      },
      confidence: 0.9,
      usedFallback: false,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      error: null,
    };
  } catch (err) {
    return {
      output: deterministic,
      confidence: 0.85,
      usedFallback: true,
      provider: null,
      model: null,
      latencyMs: Date.now() - startTime,
      error: err instanceof LLMError ? err.message : "LLM unavailable, using deterministic fallback",
    };
  }
}

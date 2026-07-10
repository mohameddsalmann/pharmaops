import type { DemoStore } from "@/lib/db/types";
import type { CaseDetail } from "@/lib/db/types";
import { runIntakeAgent } from "./intake-agent";
import { runValidationAgent } from "./validation-agent";
import { runIdentityAgent } from "./identity-agent";
import { runInsuranceAgent } from "./insurance-agent";
import { runComplianceAgent } from "./compliance-agent";
import { runExceptionAgent } from "./exception-agent";
import { runSupervisorAgent } from "./supervisor-agent";
import { computeRisk } from "@/lib/scoring/risk-score";
import type { CaseStatus } from "@/lib/schemas/case";
import { nowISO } from "@/lib/utils/id";

export interface OrchestratorResult {
  caseDetail: CaseDetail;
  success: boolean;
  error: string | null;
}

export async function runQAPipeline(
  store: DemoStore,
  caseId: string
): Promise<OrchestratorResult> {
  const existing = await store.getCase(caseId);
  if (!existing) {
    return { caseDetail: null as unknown as CaseDetail, success: false, error: "Case not found" };
  }

  if (existing.qaRunInProgress) {
    const detail = await store.getCaseDetail(caseId);
    return {
      caseDetail: detail as CaseDetail,
      success: false,
      error: "QA workflow already running for this case",
    };
  }

  const existingRuns = await store.listAgentRuns(caseId);
  if (existingRuns.length > 0) {
    const detail = await store.getCaseDetail(caseId);
    return {
      caseDetail: detail as CaseDetail,
      success: true,
      error: null,
    };
  }

  await store.updateCase(caseId, { qaRunInProgress: true });

  try {
    const rxInput = await store.getPrescriptionInput(caseId);
    if (!rxInput) throw new Error("Prescription input not found");

    const saveRun = async (
      agentName: string,
      result: {
        output: Record<string, unknown>;
        confidence: number;
        usedFallback: boolean;
        provider: string | null;
        model: string | null;
        latencyMs: number;
        error: string | null;
      },
      input: Record<string, unknown>
    ) => {
      const startedAt = nowISO();
      const run = await store.saveAgentRun({
        caseId,
        agentName,
        status: result.error ? "failed" : "completed",
        input,
        output: result.output as Record<string, unknown>,
        confidence: result.confidence,
        startedAt,
        completedAt: nowISO(),
        error: result.error,
        usedFallback: result.usedFallback,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
      });

      await store.appendAuditLog({
        caseId,
        actorType: "agent",
        actorName: agentName,
        action: `${agentName}_run`,
        details: {
          usedFallback: result.usedFallback,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        },
        confidence: result.confidence,
      });

      return run;
    };

    // Step 1: Intake Extraction
    const intakeInput = {
      prescriptionText: rxInput.prescriptionText,
      sourceType: rxInput.patientProfile ? existing.sourceType : "manual",
    };
    const intake = await runIntakeAgent(intakeInput);
    await saveRun("intake-agent", intake as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, intakeInput as Record<string, unknown>);

    // Step 2: Validation
    const validationInput = { extraction: intake.output };
    const validation = runValidationAgent(validationInput);
    await saveRun("validation-agent", validation as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, validationInput as Record<string, unknown>);

    // Step 3: Identity Match
    const identityInput = {
      extraction: intake.output,
      patientProfile: rxInput.patientProfile,
    };
    const identity = runIdentityAgent(identityInput);
    await saveRun("identity-agent", identity as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, identityInput as Record<string, unknown>);

    // Step 4: Insurance / Prior Auth
    const insuranceInput = {
      extraction: intake.output,
      insuranceProfile: rxInput.insuranceProfile,
    };
    const insurance = runInsuranceAgent(insuranceInput);
    await saveRun("insurance-agent", insurance as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, insuranceInput as Record<string, unknown>);

    // Step 5: Compliance Evidence
    const complianceInput = { extraction: intake.output };
    const compliance = runComplianceAgent(complianceInput);
    await saveRun("compliance-agent", compliance as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, complianceInput as Record<string, unknown>);

    // Save evidence to store
    if (compliance.evidence.length > 0) {
      await store.saveEvidence(
        compliance.evidence.map((e) => ({
          caseId,
          sourceTitle: e.sourceTitle,
          sourceType: e.sourceType,
          snippet: e.snippet,
          relevanceScore: e.relevanceScore,
          usedByAgent: "compliance-agent",
        }))
      );
    }

    // Step 6: Exception Classifier
    const exceptionInput = {
      extraction: intake.output,
      validation: validation.output,
      identity: identity.output,
      insurance: insurance.output,
      compliance: compliance.output,
    };
    const exceptionResult = await runExceptionAgent(exceptionInput);
    await saveRun("exception-agent", exceptionResult as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, exceptionInput as Record<string, unknown>);

    // Save exceptions to store
    await store.saveExceptions(caseId, exceptionResult.output.exceptions);

    // Step 7: Risk Score
    const riskScore = computeRisk(
      intake.output,
      validation.output,
      identity.output,
      insurance.output,
      compliance.output
    );

    await store.appendAuditLog({
      caseId,
      actorType: "system",
      actorName: "risk-score-engine",
      action: "risk_score_computed",
      details: {
        score: riskScore.score,
        level: riskScore.level,
        deductions: riskScore.deductions,
      },
      confidence: 1.0,
    });

    // Step 8: Supervisor Agent
    const supervisorInput = {
      extraction: intake.output,
      validation: validation.output,
      identity: identity.output,
      insurance: insurance.output,
      compliance: compliance.output,
      exceptions: exceptionResult.output,
      riskScore,
    };
    const supervisor = await runSupervisorAgent(supervisorInput);
    await saveRun("supervisor-agent", supervisor as unknown as { output: Record<string, unknown>; confidence: number; usedFallback: boolean; provider: string | null; model: string | null; latencyMs: number; error: string | null }, supervisorInput as Record<string, unknown>);

    // Update case with final decision
    await store.updateCase(caseId, {
      status: supervisor.output.decision as CaseStatus,
      riskLevel: supervisor.output.riskLevel,
      riskScore: riskScore.score,
      finalDecision: supervisor.output.decision,
      qaRunInProgress: false,
    });

    await store.appendAuditLog({
      caseId,
      actorType: "agent",
      actorName: "supervisor-agent",
      action: "final_decision",
      details: {
        decision: supervisor.output.decision,
        riskLevel: supervisor.output.riskLevel,
        riskScore: riskScore.score,
        usedFallback: supervisor.usedFallback,
      },
      confidence: supervisor.output.confidence,
    });

    const detail = await store.getCaseDetail(caseId);
    return { caseDetail: detail as CaseDetail, success: true, error: null };
  } catch (err) {
    await store.updateCase(caseId, {
      qaRunInProgress: false,
      status: "needs_human_review",
    });

    await store.appendAuditLog({
      caseId,
      actorType: "system",
      actorName: "orchestrator",
      action: "qa_pipeline_error",
      details: {
        error: err instanceof Error ? err.message : String(err),
      },
      confidence: null,
    });

    const detail = await store.getCaseDetail(caseId);
    return {
      caseDetail: detail as CaseDetail,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

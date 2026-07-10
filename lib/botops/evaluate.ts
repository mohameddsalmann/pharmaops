import type {
  BotRun,
  BotRunEvent,
  EvaluatorResult,
  FieldComparison,
  RegressionBaseline,
} from "@/lib/schemas/bot-run";
import { redactBotRun } from "@/lib/botops/redaction";
import { allEvaluators } from "@/lib/botops/evaluators";
import type { EvaluatorContext } from "@/lib/botops/evaluators/types";
import { computeScoring } from "@/lib/botops/scoring";
import { generateSummary } from "@/lib/botops/summarize";

export interface EvaluateOptions {
  useLlm?: boolean;
}

export interface EvaluateResult {
  run: BotRun;
  events: BotRunEvent[];
  evaluatorResults: EvaluatorResult[];
  fieldComparisons: FieldComparison[];
  overallScore: number;
  riskLevel: BotRun["riskLevel"];
  decision: BotRun["decision"];
  releaseReadinessScore: number;
  mainFinding: string;
  mainRisk: string;
  recommendedAction: string;
  recommendedEngineeringAction: string;
  recommendedQaAction: string;
  summary: string;
  reviewerNote: string;
  engineeringExplanation: string;
  usedLlm: boolean;
}

import { getExactWorkflowSpec } from "@/lib/botops/workflow-specs/registry";

export async function evaluateBotRun(
  run: BotRun,
  events: BotRunEvent[],
  expectedFields: Record<string, string>,
  enteredFields: Record<string, string>,
  baseline: RegressionBaseline | null,
  options?: EvaluateOptions
): Promise<EvaluateResult> {
  const { run: redactedRun, events: redactedEvents } = redactBotRun(run, events);

  // Correction #2 & Final Change #3: exact workflow specification matching
  const specData = getExactWorkflowSpec(
    redactedRun.pmsType,
    redactedRun.workflowType,
    redactedRun.workflowSpecVersion
  );

  if (!specData) {
    const updatedRun: BotRun = {
      ...redactedRun,
      overallScore: 0,
      riskLevel: "high",
      decision: "needs_qa_review",
      mainFinding: "No validated workflow specification exists for this PMS/workflow/version.",
      recommendedAction: "Perform manual QA; do not certify this run.",
      releaseReadinessScore: 0,
      mainRisk: "No validated workflow specification exists for this PMS/workflow/version.",
      recommendedEngineeringAction: "Create and validate a versioned workflow specification.",
      recommendedQaAction: "Perform manual QA; do not certify this run.",
      workflowSpecId: null,
      workflowSpecHash: null,
    };

    return {
      run: updatedRun,
      events: redactedEvents,
      evaluatorResults: [],
      fieldComparisons: [],
      overallScore: 0,
      riskLevel: "high",
      decision: "needs_qa_review",
      releaseReadinessScore: 0,
      mainFinding: "No validated workflow specification exists for this PMS/workflow/version.",
      mainRisk: "No validated workflow specification exists for this PMS/workflow/version.",
      recommendedAction: "Perform manual QA; do not certify this run.",
      recommendedEngineeringAction: "Create and validate a versioned workflow specification.",
      recommendedQaAction: "Perform manual QA; do not certify this run.",
      summary: "This run is unsupported as no validated workflow specification exists.",
      reviewerNote: "Perform manual QA; do not certify this run.",
      engineeringExplanation: "Create and validate a versioned workflow specification.",
      usedLlm: false,
    };
  }

  const ctx: EvaluatorContext = {
    run: redactedRun,
    events: redactedEvents,
    expectedFields,
    enteredFields,
    baseline,
    workflowSpec: specData.spec,
    specificationStatus: "supported",
  };

  const evaluatorResults: EvaluatorResult[] = [];
  const fieldComparisons: FieldComparison[] = [];

  for (const evaluator of allEvaluators) {
    const output = evaluator.evaluate(ctx);
    evaluatorResults.push(output.result);
    fieldComparisons.push(...output.fieldComparisons);
  }

  const scoring = computeScoring(evaluatorResults);

  const updatedRun: BotRun = {
    ...redactedRun,
    overallScore: scoring.overallScore,
    riskLevel: scoring.riskLevel,
    decision: scoring.decision,
    mainFinding: scoring.mainFinding,
    recommendedAction: scoring.recommendedAction,
    releaseReadinessScore: scoring.releaseReadinessScore,
    mainRisk: scoring.mainRisk,
    recommendedEngineeringAction: scoring.recommendedEngineeringAction,
    recommendedQaAction: scoring.recommendedQaAction,
    // Store spec ID and hash (Final Change #3)
    workflowSpecId: specData.id,
    workflowSpecHash: specData.hash,
  };

  const summaryResult = await generateSummary(
    updatedRun,
    evaluatorResults,
    redactedEvents,
    { useLlm: options?.useLlm ?? false }
  );

  return {
    run: updatedRun,
    events: redactedEvents,
    evaluatorResults,
    fieldComparisons,
    overallScore: scoring.overallScore,
    riskLevel: scoring.riskLevel,
    decision: scoring.decision,
    releaseReadinessScore: scoring.releaseReadinessScore,
    mainFinding: scoring.mainFinding,
    mainRisk: scoring.mainRisk,
    recommendedAction: scoring.recommendedAction,
    recommendedEngineeringAction: scoring.recommendedEngineeringAction,
    recommendedQaAction: scoring.recommendedQaAction,
    summary: summaryResult.summary,
    reviewerNote: summaryResult.reviewerNote,
    engineeringExplanation: summaryResult.engineeringExplanation,
    usedLlm: summaryResult.usedLlm,
  };
}

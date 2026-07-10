import type { BotRun, BotRunEvent, EvaluatorResult, FieldComparison } from "@/lib/schemas/bot-run";
import { EVALUATOR_VERSION } from "@/lib/botops/versions";
import { generateId } from "@/lib/utils/id";

export interface EvaluatorContext {
  run: BotRun;
  events: BotRunEvent[];
  expectedFields: Record<string, string>;
  enteredFields: Record<string, string>;
  baseline: import("@/lib/schemas/bot-run").RegressionBaseline | null;
  workflowSpec?: import("@/lib/schemas/bot-run").WorkflowSpec;
  specificationStatus?: "supported" | "unsupported";
}

export interface EvaluatorOutput {
  result: EvaluatorResult;
  fieldComparisons: FieldComparison[];
}

export interface Evaluator {
  name: import("@/lib/schemas/bot-run").EvaluatorName;
  evaluate(ctx: EvaluatorContext): EvaluatorOutput;
}

function makeResult(
  botRunId: string,
  evaluatorName: EvaluatorResult["evaluatorName"],
  score: number,
  status: EvaluatorResult["status"],
  severity: EvaluatorResult["severity"],
  findings: string[],
  recommendedAction: string,
  evidenceEventIds: string[],
  deductionReasons: EvaluatorResult["deductionReasons"]
): EvaluatorResult {
  return {
    id: generateId(),
    botRunId,
    evaluatorName,
    score,
    status,
    severity,
    findings,
    recommendedAction,
    evidenceEventIds,
    deductionReasons,
    evaluatorVersion: EVALUATOR_VERSION,
  };
}

export { makeResult };

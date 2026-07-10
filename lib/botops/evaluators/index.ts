import type { Evaluator } from "./types";
import { fieldAccuracyEvaluator } from "./field-accuracy";
import { workflowComplianceEvaluator } from "./workflow-compliance";
import { exceptionHandlingEvaluator } from "./exception-handling";
import { uiDriftEvaluator } from "./ui-drift";
import { loopStallDetectionEvaluator } from "./loop-stall-detection";
import { latencyEvaluator } from "./latency";
import { regressionEvaluator } from "./regression";

export const allEvaluators: Evaluator[] = [
  fieldAccuracyEvaluator,
  workflowComplianceEvaluator,
  exceptionHandlingEvaluator,
  uiDriftEvaluator,
  loopStallDetectionEvaluator,
  latencyEvaluator,
  regressionEvaluator,
];

export type { Evaluator, EvaluatorContext, EvaluatorOutput } from "./types";

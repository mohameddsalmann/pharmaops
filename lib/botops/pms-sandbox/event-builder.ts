import type { BotRunEvent, EventStatus } from "@/lib/schemas/bot-run";
import type { PmsSandboxState } from "./pms-state";
import type { PmsAction } from "./pms-actions";
import { actionToEventType, actionToSummary } from "./pms-actions";
import { computeBeforeHash, computeAfterHash } from "./pms-state";

export interface ScenarioStepConfig {
  confidence: number;
  durationMs: number;
  status: EventStatus;
  expectedNextAction?: string;
  actualNextAction?: string;
}

export function buildEventFromAction(
  runId: string,
  stepNumber: number,
  beforeState: PmsSandboxState,
  afterState: PmsSandboxState,
  action: PmsAction,
  config: ScenarioStepConfig
): Omit<BotRunEvent, "id" | "botRunId" | "eventSchemaVersion" | "receivedAt"> {
  const actionType = actionToEventType(action);
  const actionSummary = actionToSummary(action);

  const extractedFields: Record<string, unknown> | undefined =
    action.type === "screen_read" ? { screenText: action.screenText } : undefined;

  const enteredFields: Record<string, unknown> | undefined =
    action.type === "field_entry"
      ? { [action.fieldName]: action.value }
      : undefined;

  return {
    stepNumber,
    timestamp: new Date().toISOString(),
    screenName: afterState.currentScreen,
    actionType,
    actionSummary,
    extractedFields,
    enteredFields,
    confidence: config.confidence,
    durationMs: config.durationMs,
    status: config.status,
    beforeStateHash: computeBeforeHash(beforeState),
    afterStateHash: computeAfterHash(afterState),
    expectedNextAction: config.expectedNextAction,
    actualNextAction: config.actualNextAction,
  };
}

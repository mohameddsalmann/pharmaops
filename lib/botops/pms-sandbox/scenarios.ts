import type { PmsType, WorkflowType, EventStatus } from "@/lib/schemas/bot-run";
import type { PmsAction } from "./pms-actions";
import type { ScenarioStepConfig } from "./event-builder";

export interface BotScenario {
  id: string;
  name: string;
  description: string;
  pmsType: PmsType;
  workflowType: WorkflowType;
  botVersion: string;
  pharmacyId: string;
  pharmacyName: string;
  workflowSpecVersion: string;
  expectedFields: Record<string, string>;
  actions: Array<{ action: PmsAction; config: ScenarioStepConfig }>;
  finalOutcome: string;
}

const SCREENS = {
  patientSearch: "Patient Search",
  patientMatch: "Patient Match",
  prescriptionEntry: "Prescription Entry",
  insuranceCheck: "Insurance Check",
  finalReview: "Final Review",
};

const COMMON_PMS: Pick<BotScenario, "pmsType" | "workflowType" | "botVersion" | "pharmacyId" | "pharmacyName" | "workflowSpecVersion"> = {
  pmsType: "pioneer",
  workflowType: "prescription_intake",
  botVersion: "1.3.0",
  pharmacyId: "PHARM-DEMO-001",
  pharmacyName: "Community Pharmacy - Downtown",
  workflowSpecVersion: "1.0.0",
};

const COMMON_EXPECTED = {
  patientName: "John Doe",
  medicationName: "Lisinopril",
  strength: "10mg",
  quantity: "30",
};

function ok(confidence = 0.95, durationMs = 1000): ScenarioStepConfig {
  return { confidence, durationMs, status: "success" as EventStatus };
}

function warn(confidence: number, durationMs = 1200): ScenarioStepConfig {
  return { confidence, durationMs, status: "warning" as EventStatus };
}

function fail(confidence: number, durationMs = 1500): ScenarioStepConfig {
  return { confidence, durationMs, status: "failed" as EventStatus };
}

export const scenarios: BotScenario[] = [
  {
    ...COMMON_PMS,
    id: "scenario-clean",
    name: "Clean Success",
    description: "Bot completes the full prescription intake workflow with all fields correct and high confidence.",
    expectedFields: { ...COMMON_EXPECTED },
    finalOutcome: "Prescription intake completed successfully. All fields entered correctly.",
    actions: [
      {
        action: { type: "navigate", screenName: SCREENS.patientSearch },
        config: { ...ok(0.99, 500), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientSearch, screenText: "Patient Search - Enter patient name or DOB" },
        config: { ...ok(0.98, 1200), expectedNextAction: "field_entry", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Search" },
        config: { ...ok(0.96, 800), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.patientMatch },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientMatch, screenText: "Patient Match - John Doe, DOB: [DOB REDACTED]" },
        config: { ...ok(0.96, 1000), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.prescriptionEntry },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.prescriptionEntry, screenText: "Prescription Entry - Medication, Strength, Quantity" },
        config: { ...ok(0.95, 1100), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "Lisinopril" },
        config: { ...ok(0.94, 600), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "strength", value: "10mg" },
        config: { ...ok(0.93, 500), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "quantity", value: "30" },
        config: { ...ok(0.94, 450), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.insuranceCheck },
        config: { ...ok(0.96, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.insuranceCheck, screenText: "Insurance Check - Coverage Active" },
        config: { ...ok(0.94, 1300), expectedNextAction: "validation", actualNextAction: "validation" },
      },
      {
        action: { type: "validation", result: "pass", detail: "Insurance coverage verified" },
        config: { ...ok(0.92, 900), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.finalReview },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.finalReview, screenText: "Final Review - Lisinopril 10mg, Qty 30" },
        config: { ...ok(0.99, 900), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Submit" },
        config: { ...ok(0.97, 700), expectedNextAction: "complete", actualNextAction: "complete" },
      },
    ],
  },

  {
    ...COMMON_PMS,
    id: "scenario-ui-drift",
    name: "UI Drift",
    description: "Bot encounters low confidence screen read and failed clicks on Insurance Check — UI drift detected.",
    expectedFields: { ...COMMON_EXPECTED },
    finalOutcome: "UI drift detected: Verify Coverage button not found on Insurance Check screen. Bot routed to human handoff.",
    actions: [
      {
        action: { type: "navigate", screenName: SCREENS.patientSearch },
        config: { ...ok(0.99, 500), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientSearch, screenText: "Patient Search - Enter patient name or DOB" },
        config: { ...ok(0.98, 1200), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Search" },
        config: { ...ok(0.96, 800), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.patientMatch },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientMatch, screenText: "Patient Match - John Doe, DOB: [DOB REDACTED]" },
        config: { ...ok(0.96, 1000), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.prescriptionEntry },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.prescriptionEntry, screenText: "Prescription Entry - Medication, Strength, Quantity" },
        config: { ...ok(0.95, 1100), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "Lisinopril" },
        config: { ...ok(0.94, 600), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "strength", value: "10mg" },
        config: { ...ok(0.93, 500), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "quantity", value: "30" },
        config: { ...ok(0.94, 450), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.insuranceCheck },
        config: { ...ok(0.96, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.insuranceCheck, screenText: "Insurance Check - Layout changed, button not found" },
        config: { ...warn(0.65, 1800), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Verify Coverage" },
        config: { ...fail(0.2, 1500), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Verify Coverage" },
        config: { ...fail(0.15, 1400), expectedNextAction: "exception", actualNextAction: "exception" },
      },
      {
        action: { type: "exception", reason: "UI element 'Verify Coverage' not found after 2 attempts" },
        config: { ...fail(0.1, 300), expectedNextAction: "human_handoff", actualNextAction: "human_handoff" },
      },
      {
        action: { type: "human_handoff", reason: "UI drift on Insurance Check screen — button not found, routed to pharmacist" },
        config: { ...ok(0.9, 200), expectedNextAction: "complete", actualNextAction: "complete" },
      },
    ],
  },

  {
    ...COMMON_PMS,
    id: "scenario-loop-stall",
    name: "Loop/Stall",
    description: "Bot gets stuck retrying medication name field entry 4 times — loop detected, triggers exception and handoff.",
    expectedFields: { ...COMMON_EXPECTED },
    finalOutcome: "Loop detected: bot repeated field_entry for medicationName 4 times. Routed to human handoff.",
    actions: [
      {
        action: { type: "navigate", screenName: SCREENS.patientSearch },
        config: { ...ok(0.99, 500), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientSearch, screenText: "Patient Search - Enter patient name or DOB" },
        config: { ...ok(0.98, 1200), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Search" },
        config: { ...ok(0.96, 800), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.patientMatch },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientMatch, screenText: "Patient Match - John Doe, DOB: [DOB REDACTED]" },
        config: { ...ok(0.96, 1000), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.prescriptionEntry },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.prescriptionEntry, screenText: "Prescription Entry - Medication, Strength, Quantity" },
        config: { ...ok(0.95, 1100), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "Lisinopril" },
        config: { ...fail(0.45, 800), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "Lisinopril" },
        config: { ...fail(0.40, 750), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "Lisinopril" },
        config: { ...fail(0.35, 700), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "Lisinopril" },
        config: { ...fail(0.30, 650), expectedNextAction: "exception", actualNextAction: "exception" },
      },
      {
        action: { type: "exception", reason: "Field entry for medicationName failed after 4 attempts — possible loop" },
        config: { ...fail(0.1, 300), expectedNextAction: "human_handoff", actualNextAction: "human_handoff" },
      },
      {
        action: { type: "human_handoff", reason: "Loop detected on Prescription Entry — bot stuck retrying medicationName, routed to pharmacist" },
        config: { ...ok(0.9, 200), expectedNextAction: "complete", actualNextAction: "complete" },
      },
    ],
  },

  {
    ...COMMON_PMS,
    id: "scenario-field-mismatch",
    name: "Failed Field Entry",
    description: "Bot completes the workflow but enters wrong medication name and strength — field accuracy mismatch detected.",
    expectedFields: { ...COMMON_EXPECTED },
    finalOutcome: "Run completed but field accuracy check failed: medicationName and strength mismatch.",
    actions: [
      {
        action: { type: "navigate", screenName: SCREENS.patientSearch },
        config: { ...ok(0.99, 500), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientSearch, screenText: "Patient Search - Enter patient name or DOB" },
        config: { ...ok(0.98, 1200), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Search" },
        config: { ...ok(0.96, 800), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.patientMatch },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.patientMatch, screenText: "Patient Match - John Doe, DOB: [DOB REDACTED]" },
        config: { ...ok(0.96, 1000), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.prescriptionEntry },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.prescriptionEntry, screenText: "Prescription Entry - Medication, Strength, Quantity" },
        config: { ...ok(0.95, 1100), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "medicationName", value: "LisinoprIL" },
        config: { ...ok(0.92, 600), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "strength", value: "20mg" },
        config: { ...ok(0.91, 500), expectedNextAction: "field_entry", actualNextAction: "field_entry" },
      },
      {
        action: { type: "field_entry", fieldName: "quantity", value: "30" },
        config: { ...ok(0.94, 450), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.insuranceCheck },
        config: { ...ok(0.96, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.insuranceCheck, screenText: "Insurance Check - Coverage Active" },
        config: { ...ok(0.94, 1300), expectedNextAction: "validation", actualNextAction: "validation" },
      },
      {
        action: { type: "validation", result: "pass", detail: "Insurance coverage verified" },
        config: { ...ok(0.92, 900), expectedNextAction: "navigate", actualNextAction: "navigate" },
      },
      {
        action: { type: "navigate", screenName: SCREENS.finalReview },
        config: { ...ok(0.97, 400), expectedNextAction: "screen_read", actualNextAction: "screen_read" },
      },
      {
        action: { type: "screen_read", screenName: SCREENS.finalReview, screenText: "Final Review - LisinoprIL 20mg, Qty 30" },
        config: { ...ok(0.99, 900), expectedNextAction: "click", actualNextAction: "click" },
      },
      {
        action: { type: "click", buttonName: "Submit" },
        config: { ...ok(0.97, 700), expectedNextAction: "complete", actualNextAction: "complete" },
      },
    ],
  },
];

export function getScenarioById(id: string): BotScenario | undefined {
  return scenarios.find((s) => s.id === id);
}

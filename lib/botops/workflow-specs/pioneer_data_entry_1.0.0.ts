import type { WorkflowSpec } from "@/lib/schemas/bot-run";

export const PIONEER_DATA_ENTRY_1_0_0: WorkflowSpec = {
  specVersion: "1.0.0",
  workflowType: "data_entry",
  pmsType: "pioneer",
  requiredScreens: ["Patient Search", "Data Entry", "Final Review"],
  requiredStepOrder: ["Patient Search", "Data Entry", "Final Review"],
  requiredFields: ["pharmacyId", "medicationName", "quantity"],
  stopConditions: ["low confidence screen read on Final Review", "critical field mismatch"],
  handoffConditions: ["exception detected", "prior auth required"],
  allowedRetries: 2,
  latencyThresholdMs: 5000,
  confidenceThreshold: 0.75,
  uiFingerprints: {
    "Patient Search": "ui-fingerprint-pt-search",
    "Data Entry": "ui-fingerprint-data-entry",
    "Final Review": "ui-fingerprint-final-review",
  },
  expectedButtons: ["Submit", "Cancel"],
  expectedTerminalOutcomes: ["certified", "needs_qa_review"],
};

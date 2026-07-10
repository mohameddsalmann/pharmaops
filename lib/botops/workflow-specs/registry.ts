/**
 * Workflow Specification Registry
 *
 * Correction #2: No fallback from one PMS to another. No generic defaults.
 * Correction #9: Explicit registry with static imports so Vercel packaging is predictable.
 */
import { PIONEER_PRESCRIPTION_INTAKE_1_0_0 } from "./pioneer_prescription_intake_1.0.0";
import { PIONEER_DATA_ENTRY_1_0_0 } from "./pioneer_data_entry_1.0.0";
import type { WorkflowSpec } from "@/lib/schemas/bot-run";
import { createHash } from "crypto";

const SPEC_REGISTRY = new Map<string, { spec: WorkflowSpec; id: string; hash: string }>();

// Helper to pre-calculate hash and seed spec registry
function registerSpec(pms: string, workflow: string, version: string, spec: WorkflowSpec, specId: string) {
  const specStr = JSON.stringify(spec);
  const specHash = createHash("sha256").update(specStr).digest("hex");
  const key = `${pms.toLowerCase()}/${workflow.toLowerCase()}/${version}`;
  SPEC_REGISTRY.set(key, { spec, id: specId, hash: specHash });
}

// Register initially supported specs only (Correction #2)
registerSpec(
  "pioneer",
  "prescription_intake",
  "1.0.0",
  PIONEER_PRESCRIPTION_INTAKE_1_0_0,
  "spec-pioneer-prescription-intake-1.0.0"
);

registerSpec(
  "pioneer",
  "data_entry",
  "1.0.0",
  PIONEER_DATA_ENTRY_1_0_0,
  "spec-pioneer-data-entry-1.0.0"
);

/**
 * Returns the exact workflow spec, along with its ID and Hash.
 */
export function getExactWorkflowSpec(
  pmsType: string,
  workflowType: string,
  specVersion: string
): { spec: WorkflowSpec; id: string; hash: string } | null {
  const key = `${pmsType.toLowerCase()}/${workflowType.toLowerCase()}/${specVersion}`;
  return SPEC_REGISTRY.get(key) ?? null;
}

/**
 * Returns status of spec: "supported" or "unsupported"
 */
export function getWorkflowSpecStatus(
  pmsType: string,
  workflowType: string,
  specVersion: string
): "supported" | "unsupported" {
  const key = `${pmsType.toLowerCase()}/${workflowType.toLowerCase()}/${specVersion}`;
  return SPEC_REGISTRY.has(key) ? "supported" : "unsupported";
}

/**
 * List all available specs.
 */
export function listAvailableWorkflowSpecs() {
  return Array.from(SPEC_REGISTRY.entries()).map(([key, value]) => ({
    key,
    id: value.id,
    hash: value.hash,
    pmsType: value.spec.pmsType,
    workflowType: value.spec.workflowType,
    specVersion: value.spec.specVersion,
  }));
}

/**
 * Basic structural validation of a spec object.
 */
export function validateWorkflowSpec(spec: unknown): boolean {
  if (!spec || typeof spec !== "object") return false;
  const s = spec as Record<string, unknown>;
  return (
    typeof s.specVersion === "string" &&
    typeof s.workflowType === "string" &&
    typeof s.pmsType === "string" &&
    Array.isArray(s.requiredScreens) &&
    Array.isArray(s.requiredStepOrder) &&
    Array.isArray(s.requiredFields) &&
    Array.isArray(s.stopConditions) &&
    Array.isArray(s.handoffConditions) &&
    typeof s.allowedRetries === "number" &&
    typeof s.latencyThresholdMs === "number" &&
    typeof s.confidenceThreshold === "number"
  );
}

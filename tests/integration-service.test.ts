import { describe, it, expect } from "vitest";
import { getScenarioById, scenarios } from "@/lib/botops/pms-sandbox/scenarios";

describe("Integration Service — Scenario Resolution", () => {
  it("scenario-clean resolves to correct spec", () => {
    const s = getScenarioById("scenario-clean");
    expect(s).toBeDefined();
    expect(s?.pmsType).toBe("pioneer");
    expect(s?.workflowType).toBe("prescription_intake");
    expect(s?.workflowSpecVersion).toBe("1.0.0");
  });

  it("scenario has expected fields", () => {
    const s = getScenarioById("scenario-clean");
    expect(s).toBeDefined();
    expect(s?.expectedFields).toBeDefined();
    expect(s?.expectedFields.patientName).toBeDefined();
    expect(s?.expectedFields.medicationName).toBeDefined();
  });

  it("scenario has actions array", () => {
    const s = getScenarioById("scenario-clean");
    expect(s).toBeDefined();
    expect(s?.actions).toBeDefined();
    expect(Array.isArray(s?.actions)).toBe(true);
    expect(s?.actions.length).toBeGreaterThan(0);
  });

  it("scenario has finalOutcome", () => {
    const s = getScenarioById("scenario-clean");
    expect(s).toBeDefined();
    expect(s?.finalOutcome).toBeTruthy();
    expect(typeof s?.finalOutcome).toBe("string");
  });

  it("all scenarios have unique IDs", () => {
    const ids = new Set<string>();
    for (const s of scenarios) {
      ids.add(s.id);
    }
    expect(ids.size).toBe(scenarios.length);
    expect(ids.size).toBeGreaterThan(1);
  });

  it("scenario workflowSpecVersion is never empty", () => {
    const s = getScenarioById("scenario-clean");
    expect(s?.workflowSpecVersion.length).toBeGreaterThan(0);
  });
});

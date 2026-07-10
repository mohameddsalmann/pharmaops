import { describe, it, expect } from "vitest";
import { z } from "zod";
import { getScenarioById, scenarios } from "@/lib/botops/pms-sandbox/scenarios";

describe("Workflow Spec Version", () => {
  it("BotCity start schema requires workflowSpecVersion (no default)", () => {
    const schema = z.object({
      workflowSpecVersion: z.string().min(1),
    });
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ workflowSpecVersion: "" }).success).toBe(false);
    expect(schema.safeParse({ workflowSpecVersion: "1.0.0" }).success).toBe(true);
  });

  it("all scenarios have workflowSpecVersion", () => {
    for (const scenario of scenarios) {
      expect(scenario.workflowSpecVersion).toBeTruthy();
      expect(typeof scenario.workflowSpecVersion).toBe("string");
    }
  });

  it("scenario-clean has workflowSpecVersion 1.0.0", () => {
    const s = getScenarioById("scenario-clean");
    expect(s).toBeDefined();
    expect(s?.workflowSpecVersion).toBe("1.0.0");
  });

  it("getScenarioById returns undefined for unknown ID", () => {
    expect(getScenarioById("nonexistent")).toBeUndefined();
  });

  it("sandbox start schema only accepts scenarioId", () => {
    const sandboxSchema = z.object({
      scenarioId: z.string().min(1),
    });
    expect(sandboxSchema.safeParse({}).success).toBe(false);
    expect(sandboxSchema.safeParse({ scenarioId: "scenario-clean" }).success).toBe(true);
    expect(sandboxSchema.safeParse({ scenarioId: "scenario-clean", pmsType: "pioneer" }).success).toBe(true);
  });
});

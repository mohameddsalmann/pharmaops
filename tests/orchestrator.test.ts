import { describe, it, expect } from "vitest";
import { getMemoryStore } from "@/lib/db/memory-store";
import { runQAPipeline } from "@/lib/agents/orchestrator";

describe("runQAPipeline", () => {
  it("runs full pipeline on a new case and produces agent runs", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: `Patient: John Doe
DOB: 1985-03-15
Medication: Atorvastatin
Strength: 20 mg
Sig: Take 1 tablet by mouth once daily
Qty: 30
Refills: 3
Prescriber: Dr. Emily Carter, MD`,
      patientProfile: {
        name: "John Doe",
        dateOfBirth: "1985-03-15",
        address: null,
        phone: null,
        insuranceMemberId: "MEM123",
      },
      insuranceProfile: {
        planName: "Standard Health",
        memberId: "MEM123",
        groupNumber: "GRP001",
        priorAuthRequiredMeds: [],
        quantityLimits: [],
        active: true,
      },
    });

    const result = await runQAPipeline(store, c.id);
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.caseDetail).not.toBeNull();

    const runs = await store.listAgentRuns(c.id);
    expect(runs.length).toBeGreaterThanOrEqual(7);

    const updated = await store.getCase(c.id);
    expect(updated!.status).not.toBe("pending_qa");
    expect(updated!.riskScore).not.toBeNull();
    expect(updated!.riskLevel).not.toBeNull();
  });

  it("is idempotent — running twice does not duplicate agent runs", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: `Patient: Jane Smith
DOB: 1990-07-25
Medication: Lisinopril
Strength: 10 mg
Sig: Take 1 tablet by mouth once daily
Qty: 30
Refills: 1
Prescriber: Dr. Robert Lee, MD`,
      patientProfile: {
        name: "Jane Smith",
        dateOfBirth: "1990-07-25",
        address: null,
        phone: null,
        insuranceMemberId: null,
      },
      insuranceProfile: {
        planName: null,
        memberId: null,
        groupNumber: null,
        priorAuthRequiredMeds: [],
        quantityLimits: [],
        active: true,
      },
    });

    await runQAPipeline(store, c.id);
    const runsAfterFirst = await store.listAgentRuns(c.id);

    const secondResult = await runQAPipeline(store, c.id);
    expect(secondResult.success).toBe(true);

    const runsAfterSecond = await store.listAgentRuns(c.id);
    expect(runsAfterSecond.length).toBe(runsAfterFirst.length);
  });

  it("returns error for non-existent case", async () => {
    const store = getMemoryStore();
    const result = await runQAPipeline(store, "non-existent-id");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Case not found");
  });
});

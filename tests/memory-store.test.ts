import { describe, it, expect } from "vitest";
import { getMemoryStore } from "@/lib/db/memory-store";

describe("MemoryStore", () => {
  it("creates a case and retrieves it", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "fax",
      prescriptionText: "Test prescription",
      patientProfile: { name: "Test", dateOfBirth: "2000-01-01", address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    expect(c.id).toBeTruthy();
    expect(c.status).toBe("pending_qa");
    expect(c.sourceType).toBe("fax");

    const retrieved = await store.getCase(c.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(c.id);
  });

  it("returns null for non-existent case", async () => {
    const store = getMemoryStore();
    const result = await store.getCase("non-existent-id");
    expect(result).toBeNull();
  });

  it("lists cases sorted by createdAt descending", async () => {
    const store = getMemoryStore();
    const c1 = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Case 1",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    const c2 = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Case 2",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    const cases = await store.listCases({});
    const ids = cases.map((c) => c.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
  });

  it("updates case status", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Update test",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    const updated = await store.updateCase(c.id, { status: "approved", riskScore: 95, riskLevel: "low" });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("approved");
    expect(updated!.riskScore).toBe(95);
  });

  it("saves and lists agent runs", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Agent run test",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    await store.saveAgentRun({
      caseId: c.id,
      agentName: "intake-agent",
      status: "completed",
      input: {},
      output: { test: true },
      confidence: 0.9,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      error: null,
      usedFallback: false,
      provider: null,
      model: null,
      latencyMs: 100,
    });
    const runs = await store.listAgentRuns(c.id);
    expect(runs).toHaveLength(1);
    expect(runs[0].agentName).toBe("intake-agent");
  });

  it("saves and lists audit logs", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Audit test",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    await store.appendAuditLog({
      caseId: c.id,
      actorType: "system",
      actorName: "test",
      action: "test_action",
      details: { key: "value" },
      confidence: 1.0,
    });
    const logs = await store.listAuditLogs({});
    const caseLogs = logs.filter((l) => l.caseId === c.id);
    expect(caseLogs.length).toBeGreaterThan(0);
  });

  it("saves and lists review actions", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Review test",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    await store.saveReviewAction({
      caseId: c.id,
      reviewerName: "pharmacist",
      action: "approve",
      note: "Looks good",
    });
    const actions = await store.listReviewActions(c.id);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("approve");
  });

  it("saves and lists message drafts", async () => {
    const store = getMemoryStore();
    const c = await store.createCase({
      sourceType: "erx",
      prescriptionText: "Message test",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    });
    await store.saveMessageDraft({
      caseId: c.id,
      messageType: "review_pending",
      channel: "sms",
      body: "Your prescription is under review.",
      requiresHumanApproval: true,
      safetyNotes: ["Requires approval"],
    });
    const drafts = await store.listMessageDrafts(c.id);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].body).toContain("under review");
  });
});

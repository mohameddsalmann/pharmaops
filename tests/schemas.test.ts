import { describe, it, expect } from "vitest";
import { extractedPrescriptionSchema, supervisorDecisionSchema, patientMessageDraftSchema, exceptionItemSchema } from "@/lib/schemas/agents";
import { caseSchema, createCaseBodySchema } from "@/lib/schemas/case";
import { reviewActionSchema, createReviewBodySchema } from "@/lib/schemas/review";

describe("extractedPrescriptionSchema", () => {
  it("validates a complete extraction", () => {
    const data = {
      patientName: "John Doe",
      dateOfBirth: "1985-03-15",
      medicationName: "Atorvastatin",
      strength: "20 mg",
      directions: "Take 1 daily",
      quantity: 30,
      refills: 3,
      prescriberName: "Dr. Carter",
      sourceType: "erx",
      extractionConfidence: 0.95,
      missingFields: [],
      rawNotes: [],
    };
    const result = extractedPrescriptionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("accepts null for nullable fields", () => {
    const data = {
      patientName: null,
      dateOfBirth: null,
      medicationName: null,
      strength: null,
      directions: null,
      quantity: null,
      refills: null,
      prescriberName: null,
      sourceType: "fax",
      extractionConfidence: 0.5,
      missingFields: ["patientName", "medicationName"],
      rawNotes: [],
    };
    const result = extractedPrescriptionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("supervisorDecisionSchema", () => {
  it("validates a valid decision", () => {
    const data = {
      decision: "approved",
      riskLevel: "low",
      confidence: 0.95,
      summary: "All checks passed",
      nextAction: "Proceed",
      reasons: ["No issues"],
      evidenceUsed: ["sop.md"],
    };
    const result = supervisorDecisionSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision value", () => {
    const data = {
      decision: "maybe",
      riskLevel: "low",
      confidence: 0.5,
      summary: "test",
      nextAction: "test",
      reasons: [],
      evidenceUsed: [],
    };
    const result = supervisorDecisionSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("patientMessageDraftSchema", () => {
  it("validates a valid draft", () => {
    const data = {
      caseId: "case-1",
      messageType: "review_pending",
      channel: "sms",
      body: "Your prescription is under review.",
      requiresHumanApproval: true,
      safetyNotes: ["Requires approval"],
    };
    const result = patientMessageDraftSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid channel", () => {
    const data = {
      caseId: "case-1",
      messageType: "review_pending",
      channel: "push",
      body: "test",
      requiresHumanApproval: true,
      safetyNotes: [],
    };
    const result = patientMessageDraftSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("caseSchema", () => {
  it("validates a valid case", () => {
    const data = {
      id: "case-001",
      caseNumber: "CASE-0001",
      sourceType: "erx",
      status: "pending_qa",
      riskLevel: null,
      riskScore: null,
      finalDecision: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "demo",
      assignedReviewer: null,
      qaRunInProgress: false,
    };
    const result = caseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe("createCaseBodySchema", () => {
  it("validates with patient and insurance profiles", () => {
    const data = {
      sourceType: "erx",
      prescriptionText: "Test prescription",
      patientProfile: {
        name: "John",
        dateOfBirth: "2000-01-01",
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
    };
    const result = createCaseBodySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty prescription text", () => {
    const data = {
      sourceType: "erx",
      prescriptionText: "",
      patientProfile: { name: null, dateOfBirth: null, address: null, phone: null, insuranceMemberId: null },
      insuranceProfile: { planName: null, memberId: null, groupNumber: null, priorAuthRequiredMeds: [], quantityLimits: [], active: true },
    };
    const result = createCaseBodySchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("createReviewBodySchema", () => {
  it("validates a valid review action", () => {
    const data = {
      action: "approve",
      reviewerName: "pharmacist",
      note: "Approved",
    };
    const result = createReviewBodySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty reviewer name", () => {
    const data = {
      action: "reject",
      reviewerName: "",
      note: "",
    };
    const result = createReviewBodySchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("exceptionItemSchema", () => {
  it("validates a valid exception", () => {
    const data = {
      id: "exc-001",
      type: "missing_required_field",
      severity: "high",
      reason: "Missing DOB",
      recommendedAction: "Contact prescriber",
      confidence: 0.9,
    };
    const result = exceptionItemSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

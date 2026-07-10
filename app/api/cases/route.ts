import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth, guardResponse } from "@/lib/auth/route-guard";
import { getStore } from "@/lib/db";
import { runQAPipeline } from "@/lib/agents/orchestrator";
import { z } from "zod";

const simpleCreateSchema = z.object({
  sourceType: z.string().min(1),
  prescriptionText: z.string().min(1),
  patientProfile: z.record(z.unknown()).optional(),
  insuranceProfile: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireUserAuth(req);
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const body = await req.json();
    const parsed = simpleCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const store = getStore();

    const case_ = await store.createCase({
      sourceType: parsed.data.sourceType,
      prescriptionText: parsed.data.prescriptionText,
      patientProfile: parsed.data.patientProfile ?? {
        name: null,
        dateOfBirth: null,
        address: null,
        phone: null,
        insuranceMemberId: null,
      },
      insuranceProfile: parsed.data.insuranceProfile ?? {
        planName: null,
        memberId: null,
        groupNumber: null,
        priorAuthRequiredMeds: [],
        quantityLimits: [],
        active: true,
      },
    });

    await store.appendAuditLog({
      caseId: case_.id,
      actorType: "system",
      actorName: "api",
      action: "case_created",
      details: { sourceType: parsed.data.sourceType },
      confidence: null,
    });

    const result = await runQAPipeline(store, case_.id);

    if (!result.success && result.error) {
      return NextResponse.json(
        { caseId: case_.id, error: result.error, partial: true },
        { status: 200 }
      );
    }

    return NextResponse.json({ caseId: case_.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const store = getStore();
    const cases = await store.listCases({});
    return NextResponse.json({ cases });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

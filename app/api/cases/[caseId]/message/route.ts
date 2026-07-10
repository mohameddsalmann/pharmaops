import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth, guardResponse } from "@/lib/auth/route-guard";
import { getStore } from "@/lib/db";
import { runPatientMessageAgent } from "@/lib/agents/patient-message-agent";
import type { ExtractedPrescription, SupervisorDecision } from "@/lib/schemas/agents";
import { z } from "zod";

const messageBodySchema = z.object({
  messageType: z.enum([
    "missing_information",
    "prior_authorization",
    "review_pending",
    "refill_status",
    "general_update",
  ]),
  channel: z.enum(["sms", "call_script", "email"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const guard = await requireUserAuth(req);
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const { caseId } = await params;
    const body = await req.json();
    const parsed = messageBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const store = getStore();
    const detail = await store.getCaseDetail(caseId);

    if (!detail) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const intakeRun = detail.agentRuns.find(
      (r) => r.agentName === "intake-agent"
    );
    const extraction = intakeRun?.output as ExtractedPrescription | null;

    if (!extraction) {
      return NextResponse.json(
        { error: "No extraction data available for message generation" },
        { status: 400 }
      );
    }

    const supervisorRun = detail.agentRuns.find(
      (r) => r.agentName === "supervisor-agent"
    );
    const decision = supervisorRun?.output as SupervisorDecision | null;

    if (!decision) {
      return NextResponse.json(
        { error: "No supervisor decision available for message generation" },
        { status: 400 }
      );
    }

    const result = await runPatientMessageAgent({
      caseId,
      decision,
      extraction,
      patientName: extraction.patientName,
      caseStatus: detail.status,
    });

    const draft = await store.saveMessageDraft({
      caseId,
      messageType: parsed.data.messageType,
      channel: parsed.data.channel,
      body: result.output.body,
      requiresHumanApproval: true,
      safetyNotes: result.output.safetyNotes,
    });

    await store.appendAuditLog({
      caseId,
      actorType: "agent",
      actorName: "patient-message-agent",
      action: "message_draft_generated",
      details: {
        messageType: parsed.data.messageType,
        channel: parsed.data.channel,
        usedFallback: result.usedFallback,
      },
      confidence: result.confidence,
    });

    return NextResponse.json({ draft });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth, guardResponse } from "@/lib/auth/route-guard";
import { getStore } from "@/lib/db";
import { z } from "zod";

const reviewBodySchema = z.object({
  action: z.enum([
    "approve",
    "reject",
    "request_info",
    "send_to_prior_auth",
    "assign_to_pharmacist",
  ]),
  notes: z.string().default(""),
});

const actionToStatus: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  request_info: "missing_information",
  send_to_prior_auth: "prior_authorization_required",
  assign_to_pharmacist: "in_review",
};

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
    const parsed = reviewBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const store = getStore();
    const existing = await store.getCase(caseId);

    if (!existing) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const reviewerName = "pharmacist_reviewer";

    await store.saveReviewAction({
      caseId,
      reviewerName,
      action: parsed.data.action,
      note: parsed.data.notes,
    });

    const newStatus = actionToStatus[parsed.data.action] ?? existing.status;
    await store.updateCase(caseId, {
      status: newStatus as "pending_qa" | "approved" | "needs_human_review" | "missing_information" | "prior_authorization_required" | "rejected" | "cannot_determine" | "in_review",
      assignedReviewer: reviewerName,
    });

    await store.appendAuditLog({
      caseId,
      actorType: "human",
      actorName: reviewerName,
      action: `review_${parsed.data.action}`,
      details: { note: parsed.data.notes, previousStatus: existing.status, newStatus },
      confidence: null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

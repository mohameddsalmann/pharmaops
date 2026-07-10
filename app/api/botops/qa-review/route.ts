import { NextRequest, NextResponse } from "next/server";
import { requireQaEngineer, guardResponse } from "@/lib/auth/route-guard";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { z } from "zod";

const qaReviewSchema = z.object({
  botRunId: z.string().min(1),
  reviewerName: z.string().min(1),
  action: z.enum([
    "approve_for_automation",
    "hold_for_review",
    "block_automation",
    "flag_regression",
    "flag_drift",
    "assign_reviewer",
  ]),
  note: z.string().default(""),
});

export async function GET(req: NextRequest) {
  try {
    const store = await getSeededBotOpsStore();
    const params = req.nextUrl.searchParams;
    const runId = params.get("runId");
    const actions = runId ? await store.getQaReviewActions(runId) : [];
    return NextResponse.json({ actions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireQaEngineer(req);
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const body = await req.json();
    const parsed = qaReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const store = await getSeededBotOpsStore();
    const action = await store.addQaReviewAction(parsed.data);
    await store.addAuditLog({
      botRunId: parsed.data.botRunId,
      actorType: "human",
      actorName: parsed.data.reviewerName,
      action: `qa_review_${parsed.data.action}`,
      details: { note: parsed.data.note },
    });

    return NextResponse.json({ action });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, guardResponse } from "@/lib/auth/route-guard";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const store = await getSeededBotOpsStore();
    const detail = await store.getRunDetail(runId);
    if (!detail) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ run: detail });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const guard = await requireAdmin(req);
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const { runId } = await params;
    const store = await getSeededBotOpsStore();
    await store.deleteRun(runId);
    await store.addAuditLog({
      botRunId: runId,
      actorType: "system",
      actorName: "api",
      action: "run_deleted",
      details: {},
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

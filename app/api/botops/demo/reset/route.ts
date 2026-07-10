import { NextResponse } from "next/server";
import { requireDevOnly, guardResponse } from "@/lib/auth/route-guard";
import { resetBotOpsStore } from "@/lib/db/botops-index";

export async function POST() {
  const guard = requireDevOnly();
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    await resetBotOpsStore();
    return NextResponse.json({ reset: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

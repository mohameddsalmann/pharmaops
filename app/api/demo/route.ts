import { NextRequest, NextResponse } from "next/server";
import { requireDevOnly, guardResponse } from "@/lib/auth/route-guard";
import { getStore } from "@/lib/db";

export async function POST(req: NextRequest) {
  const guard = requireDevOnly();
  const guardResp = guardResponse(guard);
  if (guardResp) return guardResp;
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const store = getStore();

    if (action === "reset") {
      await store.resetDemoData();
      return NextResponse.json({ success: true, message: "Demo data reset" });
    }

    await store.seedDemoData();
    return NextResponse.json({ success: true, message: "Demo data seeded" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

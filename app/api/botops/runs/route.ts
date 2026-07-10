import { NextRequest, NextResponse } from "next/server";
import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import type { BotRunFilters } from "@/lib/schemas/bot-run";

export async function GET(req: NextRequest) {
  try {
    const store = await getSeededBotOpsStore();
    const params = req.nextUrl.searchParams;
    const filters: BotRunFilters = {};
    const status = params.get("status");
    if (status) filters.status = status;
    const riskLevel = params.get("riskLevel");
    if (riskLevel) filters.riskLevel = riskLevel;
    const decision = params.get("decision");
    if (decision) filters.decision = decision;
    const workflowType = params.get("workflowType");
    if (workflowType) filters.workflowType = workflowType;
    const pmsType = params.get("pmsType");
    if (pmsType) filters.pmsType = pmsType;
    const botVersion = params.get("botVersion");
    if (botVersion) filters.botVersion = botVersion;
    const search = params.get("search");
    if (search) filters.search = search;
    const needsReview = params.get("needsReview");
    if (needsReview === "true") filters.needsReview = true;

    const runs = await store.listRuns(filters);
    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

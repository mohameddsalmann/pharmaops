export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { PageHeader } from "@/components/PageHeader";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { Upload, Lock } from "lucide-react";
import Link from "next/link";
import { RunsListClient } from "@/components/botops/RunsListClient";
import { isProduction } from "@/lib/utils/env";
import { DatabaseErrorState } from "@/components/DatabaseErrorState";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const filters: import("@/lib/schemas/bot-run").BotRunFilters = {};
  if (params.status) filters.status = String(params.status);
  if (params.riskLevel) filters.riskLevel = String(params.riskLevel);
  if (params.decision) filters.decision = String(params.decision);
  if (params.workflowType) filters.workflowType = String(params.workflowType);
  if (params.pmsType) filters.pmsType = String(params.pmsType);
  if (params.search) filters.search = String(params.search);
  if (params.needsReview === "true") filters.needsReview = true;

  let runs: import("@/lib/schemas/bot-run").BotRun[] = [];
  let dbError = false;

  try {
    const store = await getSeededBotOpsStore();
    runs = await store.listRuns(filters);
  } catch (err) {
    console.error("[runs] Database error:", err);
    dbError = true;
  }

  if (dbError) {
    return (
      <PageFadeIn>
        <PageHeader title="Bot Runs" description="Browse and evaluate pharmacy automation bot runs" />
        <DatabaseErrorState />
      </PageFadeIn>
    );
  }

  return (
    <PageFadeIn>
      <PageHeader
        title="Bot Runs"
        description="Browse and evaluate pharmacy automation bot runs"
        actions={
          isProduction() ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-navy-800/40 px-3 py-2 text-sm text-slate-600">
              <Lock className="h-4 w-4" />
              Enterprise authentication required
            </span>
          ) : (
            <Link href="/runs/import" className="btn-primary">
              <Upload className="h-4 w-4" /> Import Run
            </Link>
          )
        }
      />

      <RunsListClient initialRuns={runs} />
    </PageFadeIn>
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { PageHeader } from "@/components/PageHeader";
import { BotRunTable } from "@/components/botops/BotRunTable";
import { ClipboardCheck } from "lucide-react";
import { DatabaseErrorState } from "@/components/DatabaseErrorState";

export default async function QaReviewPage() {
  let runs: import("@/lib/schemas/bot-run").BotRun[] = [];
  let allActions: import("@/lib/schemas/bot-run").BotOpsAuditLog[] = [];
  let dbError = false;

  try {
    const store = await getSeededBotOpsStore();
    runs = await store.listRuns({ needsReview: true });
    allActions = await store.getAuditLogs();
  } catch (err) {
    console.error("[qa-review] Database error:", err);
    dbError = true;
  }

  if (dbError) {
    return (
      <PageFadeIn>
        <PageHeader title="QA Review Queue" description="Bot runs that need human review before release" />
        <DatabaseErrorState />
      </PageFadeIn>
    );
  }

  const reviewActions = allActions.filter((l) => l.action.startsWith("qa_review_"));

  return (
    <PageFadeIn>
      <PageHeader
        title="QA Review Queue"
        description="Bot runs that need human review before release"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <ClipboardCheck className="h-4 w-4" />
            <span>{runs.length} run(s) need review</span>
          </div>
          <BotRunTable runs={runs} />
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Recent Review Actions</h3>
            <div className="space-y-2">
              {reviewActions.length === 0 ? (
                <p className="text-xs text-slate-500">No review actions recorded yet.</p>
              ) : (
                reviewActions.slice(0, 10).map((log) => (
                  <div key={log.id} className="rounded border border-navy-700/60 bg-navy-900/50 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200">
                        {log.action.replace("qa_review_", "").replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">by {log.actorName}</div>
                    {typeof log.details?.note === "string" && log.details.note && (
                      <p className="mt-1 text-xs text-slate-300">{log.details.note}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageFadeIn>
  );
}

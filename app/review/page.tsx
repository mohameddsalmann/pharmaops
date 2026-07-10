import { getSeededStore } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { CaseTable } from "@/components/CaseTable";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, FileQuestion } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

export default async function ReviewPage() {
  const store = await getSeededStore();
  const allCases = await store.listCases({});

  const needsReview = allCases.filter(
    (c) => c.status === "needs_human_review" || c.status === "in_review"
  );
  const pendingQa = allCases.filter((c) => c.status === "pending_qa");
  const approved = allCases.filter((c) => c.status === "approved");
  const priorAuth = allCases.filter((c) => c.status === "prior_authorization_required");
  const missingInfo = allCases.filter((c) => c.status === "missing_information");

  return (
    <div>
      <PageHeader
        title="Review Queue"
        description="Cases requiring human review and QA attention"
      />

      <PageFadeIn>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Needs Human Review"
            value={needsReview.length}
            icon={<AlertTriangle className="h-5 w-5" />}
            trend={needsReview.length > 0 ? "Action required" : "All clear"}
          />
          <MetricCard
            label="Prior Authorization"
            value={priorAuth.length}
            icon={<ShieldAlert className="h-5 w-5" />}
            trend={priorAuth.length > 0 ? "Route to PA" : "None"}
          />
          <MetricCard
            label="Missing Information"
            value={missingInfo.length}
            icon={<FileQuestion className="h-5 w-5" />}
          />
          <MetricCard
            label="Pending QA"
            value={pendingQa.length}
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {needsReview.length > 0 ? (
          <div className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <AlertTriangle className="h-5 w-5 text-status-amber" />
              Awaiting Human Review
            </h2>
            <CaseTable cases={needsReview} />
          </div>
        ) : (
          <div className="card mb-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-status-green" />
            <p className="mt-3 text-sm text-slate-400">
              No cases currently need human review.
            </p>
          </div>
        )}

        {priorAuth.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <ShieldAlert className="h-5 w-5 text-accent-cyan" />
              Prior Authorization Required
            </h2>
            <CaseTable cases={priorAuth} />
          </div>
        )}

        {missingInfo.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <FileQuestion className="h-5 w-5 text-status-amber" />
              Missing Information
            </h2>
            <CaseTable cases={missingInfo} />
          </div>
        )}

        {pendingQa.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-5 w-5 text-slate-400" />
              Pending QA Pipeline
            </h2>
            <CaseTable cases={pendingQa} />
          </div>
        )}

        {approved.length > 0 && (
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
              <CheckCircle className="h-5 w-5 text-status-green" />
              Recently Approved
            </h2>
            <CaseTable cases={approved.slice(0, 10)} />
          </div>
        )}
      </PageFadeIn>
    </div>
  );
}

import { getSeededStore } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { BarChart3, TrendingUp, Clock, DollarSign, AlertTriangle, Bot, CheckCircle, Cpu, Zap, Gauge } from "lucide-react";
import { formatStatus, formatExceptionType } from "@/lib/utils/format";

export default async function MetricsPage() {
  const store = await getSeededStore();
  const cases = await store.listCases({});
  const auditLogs = await store.listAuditLogs({});
  const metrics = computeMetrics(cases, auditLogs);

  const agentLogs = auditLogs.filter((l) => l.actorType === "agent");
  const llmCallCount = agentLogs.filter((l) => l.details?.usedFallback === false).length;
  const fallbackCount = agentLogs.filter((l) => l.details?.usedFallback === true).length;
  const totalAgentRuns = agentLogs.length;

  const statusBreakdown = [
    { status: "pending_qa", color: "bg-slate-500" },
    { status: "in_review", color: "bg-accent-cyan" },
    { status: "needs_human_review", color: "bg-status-amber" },
    { status: "approved", color: "bg-status-green" },
    { status: "rejected", color: "bg-status-red" },
    { status: "prior_authorization_required", color: "bg-accent-cyan" },
    { status: "missing_information", color: "bg-status-amber" },
  ];

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Aggregate performance metrics for the QA pipeline"
      />

      <PageFadeIn>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Cases"
            value={metrics.totalCases}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <MetricCard
            label="Approved"
            value={metrics.approvedCases}
            icon={<CheckCircle className="h-5 w-5" />}
            trend={`${(metrics.automationApprovalRate * 100).toFixed(0)}% automation rate`}
          />
          <MetricCard
            label="Human Review"
            value={metrics.humanReviewCases}
            icon={<AlertTriangle className="h-5 w-5" />}
            trend={`${(metrics.humanReviewRate * 100).toFixed(0)}% review rate`}
          />
          <MetricCard
            label="High Risk"
            value={metrics.highRiskCases}
            icon={<AlertTriangle className="h-5 w-5" />}
            trend="Stopped before automation"
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Avg Confidence"
            value={`${(metrics.averageConfidence * 100).toFixed(1)}%`}
            icon={<Gauge className="h-5 w-5" />}
          />
          <MetricCard
            label="Avg Risk Score"
            value={metrics.averageRiskScore.toFixed(1)}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <MetricCard
            label="Est. Minutes Saved"
            value={metrics.estimatedMinutesSaved}
            icon={<Clock className="h-5 w-5" />}
            trend="vs manual review"
          />
          <MetricCard
            label="Est. Cost Saved"
            value={`$${metrics.estimatedCostSaved.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
            trend="labor cost avoided"
          />
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Agent Runs"
            value={totalAgentRuns}
            icon={<Bot className="h-5 w-5" />}
          />
          <MetricCard
            label="LLM Calls"
            value={llmCallCount}
            icon={<Zap className="h-5 w-5" />}
          />
          <MetricCard
            label="Fallbacks Used"
            value={fallbackCount}
            icon={<Cpu className="h-5 w-5" />}
            trend={fallbackCount > 0 ? `${((fallbackCount / (llmCallCount + fallbackCount)) * 100).toFixed(0)}% of runs` : "No fallbacks"}
          />
          <MetricCard
            label="Top Exception Type"
            value={metrics.topExceptionType ? formatExceptionType(metrics.topExceptionType) : "None"}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
        </div>

        <div className="card">
          <h2 className="mb-4 text-sm font-bold text-white">Case Status Breakdown</h2>
          <div className="space-y-3">
            {statusBreakdown.map(({ status, color }) => {
              const count = cases.filter((c) => c.status === status).length;
              const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-48 text-xs text-slate-400">{formatStatus(status)}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-navy-800">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-white">{count}</span>
                  <span className="w-12 text-right text-[10px] text-slate-500">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </PageFadeIn>
    </div>
  );
}

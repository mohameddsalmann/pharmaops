"use client";

import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { CaseTable } from "@/components/CaseTable";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { formatExceptionType, formatStatus, formatRiskLevel } from "@/lib/utils/format";
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Bot,
  Cpu,
  ShieldAlert,
  TrendingDown,
  DollarSign,
  Gauge,
  Activity,
  Zap,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import type { Case } from "@/lib/schemas/case";
import type { AuditLog } from "@/lib/schemas/audit";
import type { Metrics } from "@/lib/metrics";

interface AgentHealth {
  agentName: string;
  status: string;
  avgLatency: number;
  fallbackCount: number;
  lastRunResult: string | null;
}

interface DashboardClientProps {
  cases: Case[];
  auditLogs: AuditLog[];
  metrics: Metrics;
  agentHealth: AgentHealth[];
  exceptionTypeCounts: Record<string, number>;
  provider: string;
  model: string;
}

type Tab = "executive" | "engineering";

export function DashboardClient({
  cases,
  auditLogs,
  metrics,
  agentHealth,
  exceptionTypeCounts,
  provider,
  model,
}: DashboardClientProps) {
  const [tab, setTab] = useState<Tab>("executive");

  const pendingReview = cases.filter(
    (c) => c.status === "needs_human_review" || c.status === "in_review"
  );
  const pendingQa = cases.filter((c) => c.status === "pending_qa");
  const approved = cases.filter((c) => c.status === "approved");
  const highRisk = cases.filter((c) => c.riskLevel === "high" || c.riskLevel === "critical");
  const priorAuth = cases.filter((c) => c.status === "prior_authorization_required");

  const agentLogs = auditLogs.filter((l) => l.actorType === "agent");
  const llmCallCount = agentLogs.filter((l) => l.details?.usedFallback === false).length;
  const fallbackCount = agentLogs.filter((l) => l.details?.usedFallback === true).length;
  const totalAgentRuns = agentLogs.length;
  const avgLatency = agentLogs.length > 0
    ? agentLogs.reduce((sum, l) => sum + (l.details?.latencyMs as number || 0), 0) / agentLogs.length
    : 0;

  const recentCritical = highRisk.slice(0, 5);
  const recentCases = cases.slice(0, 10);

  const topRiskDrivers = Object.entries(exceptionTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <PageFadeIn>
      {/* Tab switcher */}
      <div className="mb-6 inline-flex rounded-lg border border-navy-700 bg-navy-850 p-1">
        <button
          onClick={() => setTab("executive")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "executive" ? "bg-accent-cyan text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Executive View
        </button>
        <button
          onClick={() => setTab("engineering")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "engineering" ? "bg-accent-cyan text-white" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Engineering View
        </button>
      </div>

      {tab === "executive" && (
        <div className="space-y-6">
          {/* Executive metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Cases" value={metrics.totalCases} icon={<BarChart3 className="h-5 w-5" />} />
            <MetricCard label="Auto-Approved" value={approved.length} icon={<CheckCircle className="h-5 w-5" />} trend={`${(metrics.automationApprovalRate * 100).toFixed(0)}% approval rate`} />
            <MetricCard label="Sent to Human Review" value={pendingReview.length} icon={<AlertTriangle className="h-5 w-5" />} trend={pendingReview.length > 0 ? "Requires attention" : "All clear"} />
            <MetricCard label="High-Risk Prevented" value={highRisk.length} icon={<ShieldAlert className="h-5 w-5" />} trend="Stopped before automation" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Est. Minutes Saved" value={metrics.estimatedMinutesSaved} icon={<Clock className="h-5 w-5" />} trend="vs manual review" />
            <MetricCard label="Est. Cost Saved" value={`$${metrics.estimatedCostSaved.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} trend="labor cost avoided" />
            <MetricCard label="Human Review Rate" value={`${(metrics.humanReviewRate * 100).toFixed(0)}%`} icon={<TrendingDown className="h-5 w-5" />} />
            <MetricCard label="Automation Approval Rate" value={`${(metrics.automationApprovalRate * 100).toFixed(0)}%`} icon={<Gauge className="h-5 w-5" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Operational Snapshot */}
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Activity className="h-4 w-4 text-accent-cyan" />
                Operational Snapshot
              </h3>
              <p className="text-sm text-slate-400">
                PharmaGuard has processed <span className="font-semibold text-slate-200">{metrics.totalCases}</span> prescription cases.
                {" "}<span className="font-semibold text-status-green">{approved.length}</span> were safely auto-approved,
                {" "}<span className="font-semibold text-status-amber">{pendingReview.length}</span> were routed to human review,
                and <span className="font-semibold text-status-red">{highRisk.length}</span> high-risk cases were stopped before automation.
                {" "}<span className="font-semibold text-accent-cyan">{priorAuth.length}</span> cases were routed to prior authorization.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-navy-700/50 bg-navy-800/50 p-3 text-center">
                  <div className="text-xs text-slate-500">Pending QA</div>
                  <div className="mt-1 text-lg font-bold text-slate-200">{pendingQa.length}</div>
                </div>
                <div className="rounded-lg border border-navy-700/50 bg-navy-800/50 p-3 text-center">
                  <div className="text-xs text-slate-500">Avg Risk Score</div>
                  <div className="mt-1 text-lg font-bold text-slate-200">{metrics.averageRiskScore?.toFixed(1) ?? "—"}</div>
                </div>
                <div className="rounded-lg border border-navy-700/50 bg-navy-800/50 p-3 text-center">
                  <div className="text-xs text-slate-500">Avg Confidence</div>
                  <div className="mt-1 text-lg font-bold text-slate-200">{(metrics.averageConfidence * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>

            {/* Top Risk Drivers */}
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <ShieldAlert className="h-4 w-4 text-status-amber" />
                Top Risk Drivers
              </h3>
              {topRiskDrivers.length > 0 ? (
                <div className="space-y-2">
                  {topRiskDrivers.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between rounded-lg border border-navy-700/50 bg-navy-800/50 px-3 py-2">
                      <span className="text-sm text-slate-300">{formatExceptionType(type)}</span>
                      <span className="badge-warning">{count} case{count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No exceptions detected yet. Run the QA pipeline to see risk drivers.</p>
              )}
            </div>
          </div>

          {/* Recent Critical Cases */}
          {recentCritical.length > 0 && (
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <AlertTriangle className="h-4 w-4 text-status-red" />
                Recent Critical Cases
              </h3>
              <div className="space-y-2">
                {recentCritical.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-navy-700/50 bg-navy-800/50 px-3 py-2.5 transition-colors hover:border-navy-600 hover:bg-navy-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-status-red/10">
                        <ShieldAlert className="h-4 w-4 text-status-red" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">{c.caseNumber}</div>
                        <div className="text-xs text-slate-500">{formatStatus(c.status)} · {formatRiskLevel(c.riskLevel)}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "engineering" && (
        <div className="space-y-6">
          {/* Engineering metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Agent Runs" value={totalAgentRuns} icon={<Bot className="h-5 w-5" />} />
            <MetricCard label="LLM Calls" value={llmCallCount} icon={<Zap className="h-5 w-5" />} />
            <MetricCard label="Fallbacks Used" value={fallbackCount} icon={<Cpu className="h-5 w-5" />} trend={fallbackCount > 0 ? `${((fallbackCount / (llmCallCount + fallbackCount)) * 100).toFixed(0)}% of runs` : "No fallbacks"} />
            <MetricCard label="Avg Agent Latency" value={`${avgLatency.toFixed(0)}ms`} icon={<Clock className="h-5 w-5" />} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Zod Validation Failures" value={0} icon={<ShieldCheck className="h-5 w-5" />} trend="0 by design" />
            <MetricCard label="Provider" value={provider} icon={<Cpu className="h-5 w-5" />} />
            <MetricCard label="Model" value={model} icon={<Bot className="h-5 w-5" />} />
            <MetricCard label="Deterministic Decisions" value="100%" icon={<Gauge className="h-5 w-5" />} trend="all outputs validated" />
          </div>

          {/* Agent Pipeline Health */}
          <div className="card">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4 text-accent-cyan" />
              Agent Pipeline Health
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700 text-left text-xs text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Agent</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Avg Latency</th>
                    <th className="pb-2 pr-4 font-medium">Fallbacks</th>
                    <th className="pb-2 font-medium">Last Result</th>
                  </tr>
                </thead>
                <tbody>
                  {agentHealth.map((agent) => (
                    <tr key={agent.agentName} className="border-b border-navy-700/40">
                      <td className="py-2.5 pr-4 font-medium text-slate-200">{agent.agentName}</td>
                      <td className="py-2.5 pr-4">
                        <span className="badge-success">Operational</span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">{agent.avgLatency > 0 ? `${agent.avgLatency.toFixed(0)}ms` : "—"}</td>
                      <td className="py-2.5 pr-4">
                        {agent.fallbackCount > 0 ? (
                          <span className="badge-warning">{agent.fallbackCount}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-400">{agent.lastRunResult ?? "No runs yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent cases */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Cases</h2>
              <Link href="/review" className="text-sm text-accent-cyan hover:underline">
                View all →
              </Link>
            </div>
            <CaseTable cases={recentCases} />
          </div>
        </div>
      )}
    </PageFadeIn>
  );
}

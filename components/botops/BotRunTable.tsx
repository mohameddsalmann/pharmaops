"use client";

import Link from "next/link";
import type { BotRun } from "@/lib/schemas/bot-run";
import { formatQaDecision, formatRiskLevel, formatWorkflowType, formatPmsType } from "@/lib/utils/format";

const statusBadgeClass: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
  stalled: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  needs_human_review: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30",
};

const decisionBadgeClass: Record<string, string> = {
  safe_to_automate: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  needs_qa_review: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  regression_detected: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  ui_drift_detected: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  stop_automation: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function BotRunTable({ runs }: { runs: BotRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        No bot runs found. Click &quot;Seed Demo Runs&quot; to load sample data.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700/60 bg-navy-900/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3 font-semibold">Run #</th>
            <th className="px-4 py-3 font-semibold">Pharmacy</th>
            <th className="px-4 py-3 font-semibold">Workflow</th>
            <th className="px-4 py-3 font-semibold">PMS</th>
            <th className="px-4 py-3 font-semibold">Bot Ver</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Score</th>
            <th className="px-4 py-3 font-semibold">Risk</th>
            <th className="px-4 py-3 font-semibold">Decision</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-800/60">
          {runs.map((run) => (
            <tr key={run.id} className="transition-colors hover:bg-navy-800/40">
              <td className="px-4 py-3">
                <Link href={`/runs/${run.id}`} className="font-medium text-accent-cyan hover:underline">
                  {run.runNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-300">{run.pharmacyName}</td>
              <td className="px-4 py-3 text-slate-300">{formatWorkflowType(run.workflowType)}</td>
              <td className="px-4 py-3 text-slate-300">{formatPmsType(run.pmsType)}</td>
              <td className="px-4 py-3 font-mono-data text-slate-400">v{run.botVersion}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass[run.status] ?? "bg-navy-700/40 text-slate-400 border-navy-600"}`}>
                  {run.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-3">
                {run.overallScore !== null ? (
                  <span className={`font-mono-data font-semibold tabular-nums ${run.overallScore >= 85 ? "text-emerald-400" : run.overallScore >= 70 ? "text-amber-400" : "text-red-400"}`}>
                    {run.overallScore}
                  </span>
                ) : (
                  <span className="text-slate-500">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-300">{formatRiskLevel(run.riskLevel)}</td>
              <td className="px-4 py-3">
                {run.decision ? (
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${decisionBadgeClass[run.decision] ?? "bg-navy-700/40 text-slate-400 border-navy-600"}`}>
                    {formatQaDecision(run.decision)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Pending</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

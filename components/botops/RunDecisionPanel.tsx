"use client";

import type { BotRun } from "@/lib/schemas/bot-run";
import { formatQaDecision, formatRiskLevel } from "@/lib/utils/format";

const decisionStyle: Record<string, string> = {
  safe_to_automate: "border-emerald-500/40 bg-emerald-500/10",
  needs_qa_review: "border-amber-500/40 bg-amber-500/10",
  regression_detected: "border-orange-500/40 bg-orange-500/10",
  ui_drift_detected: "border-amber-500/40 bg-amber-500/10",
  stop_automation: "border-red-500/40 bg-red-500/10",
};

export function RunDecisionPanel({ run }: { run: BotRun }) {
  const readiness = run.releaseReadinessScore ?? 0;
  const readinessColor = readiness >= 85 ? "text-emerald-400" : readiness >= 70 ? "text-amber-400" : "text-red-400";

  return (
    <div className={`card-bezel ${decisionStyle[run.decision ?? ""] ?? ""}`}>
      <div className="card-bezel-inner p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Release Readiness</h3>
          <span className={`font-mono-data text-2xl font-bold tabular-nums ${readinessColor}`}>{readiness}</span>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Decision</span>
            <span className="font-medium text-slate-200">{formatQaDecision(run.decision)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Overall Score</span>
            <span className="font-mono-data font-semibold tabular-nums text-slate-200">{run.overallScore ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Risk Level</span>
            <span className="font-medium text-slate-200">{formatRiskLevel(run.riskLevel)}</span>
          </div>
        </div>

        {run.mainFinding && (
          <div className="mt-3 border-t border-navy-700/40 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Main Finding</div>
            <p className="mt-0.5 text-xs text-slate-300">{run.mainFinding}</p>
          </div>
        )}

        {run.mainRisk && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Main Risk</div>
            <p className="mt-0.5 text-xs text-slate-300">{run.mainRisk}</p>
          </div>
        )}

        {run.recommendedAction && (
          <div className="mt-2 rounded border border-navy-700/40 bg-navy-850/50 p-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommended Action</div>
            <p className="mt-0.5 text-xs text-slate-300">{run.recommendedAction}</p>
          </div>
        )}

        {run.recommendedEngineeringAction && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Engineering Action</div>
            <p className="mt-0.5 text-xs text-slate-300">{run.recommendedEngineeringAction}</p>
          </div>
        )}

        {run.recommendedQaAction && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-accent-cyan">QA Action</div>
            <p className="mt-0.5 text-xs text-slate-300">{run.recommendedQaAction}</p>
          </div>
        )}
      </div>
    </div>
  );
}

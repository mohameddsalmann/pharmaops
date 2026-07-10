"use client";

import type { EvaluatorResult } from "@/lib/schemas/bot-run";
import { formatEvaluatorName } from "@/lib/utils/format";

const statusStyle: Record<string, string> = {
  passed: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  failed: "border-red-500/30 bg-red-500/5",
};

const statusBadge: Record<string, string> = {
  passed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

const severityBadge: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function EvaluatorResultCard({ result }: { result: EvaluatorResult }) {
  return (
    <div className={`rounded-lg border p-4 ${statusStyle[result.status] ?? "border-navy-700/60 bg-navy-900/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-200">{formatEvaluatorName(result.evaluatorName)}</h4>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusBadge[result.status]}`}>
              {result.status}
            </span>
            <span className={`text-[10px] font-medium uppercase ${severityBadge[result.severity]}`}>
              {result.severity}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span className="font-mono-data">Score: <span className={`font-semibold tabular-nums ${result.score >= 85 ? "text-emerald-400" : result.score >= 70 ? "text-amber-400" : "text-red-400"}`}>{result.score}</span></span>
            <span className="font-mono-data">v{result.evaluatorVersion}</span>
          </div>
        </div>
      </div>

      {result.findings.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {result.findings.map((finding, idx) => (
            <li key={idx} className="border-l-2 border-navy-600 pl-2.5 text-xs text-slate-300">
              {finding}
            </li>
          ))}
        </ul>
      )}

      {result.deductionReasons.length > 0 && (
        <div className="mt-3 border-t border-navy-700/40 pt-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Deductions</div>
          <div className="mt-1 space-y-0.5">
            {result.deductionReasons.map((reason, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{reason.label}</span>
                <span className="font-mono-data text-red-400">-{reason.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 rounded border border-navy-700/40 bg-navy-850/50 p-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommended Action</div>
        <p className="mt-0.5 text-xs text-slate-300">{result.recommendedAction}</p>
      </div>
    </div>
  );
}

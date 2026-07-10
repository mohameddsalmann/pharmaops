"use client";

import type { FieldComparison } from "@/lib/schemas/bot-run";

const severityColor: Record<string, string> = {
  low: "border-navy-600 text-slate-400",
  medium: "border-amber-500/30 text-amber-400",
  high: "border-orange-500/30 text-orange-400",
  critical: "border-red-500/30 text-red-400",
};

export function FieldComparisonTable({ comparisons }: { comparisons: FieldComparison[] }) {
  if (comparisons.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-slate-400">
        No field comparisons available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700/60 bg-navy-900/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2 font-semibold">Field</th>
            <th className="px-3 py-2 font-semibold">Expected</th>
            <th className="px-3 py-2 font-semibold">Actual</th>
            <th className="px-3 py-2 font-semibold">Match</th>
            <th className="px-3 py-2 font-semibold">Severity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-800/60">
          {comparisons.map((fc) => (
            <tr key={fc.id} className={fc.match ? "" : "bg-red-500/5"}>
              <td className="px-3 py-2 font-medium text-slate-300">{fc.fieldName}</td>
              <td className="px-3 py-2 font-mono-data text-xs text-slate-400">{fc.expectedValue ?? "—"}</td>
              <td className="px-3 py-2 font-mono-data text-xs text-slate-400">{fc.actualValue ?? "—"}</td>
              <td className="px-3 py-2">
                {fc.match ? (
                  <span className="text-xs text-emerald-400">✓ Match</span>
                ) : (
                  <span className="text-xs text-red-400">✗ Mismatch</span>
                )}
              </td>
              <td className="px-3 py-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityColor[fc.severity] ?? "border-navy-600 text-slate-400"}`}>
                  {fc.severity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

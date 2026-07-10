import Link from "next/link";
import type { Case } from "@/lib/schemas/case";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";
import { formatSourceType, formatStatus } from "@/lib/utils/format";

export function CaseTable({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return (
      <div className="card text-center text-slate-400">
        No cases found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700">
      <table className="w-full text-sm">
        <thead className="bg-navy-800 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Case #</th>
            <th className="px-4 py-3 text-left font-medium">Source</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Risk</th>
            <th className="px-4 py-3 text-left font-medium">Decision</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700">
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-navy-800/50">
              <td className="px-4 py-3">
                <Link href={`/cases/${c.id}`} className="font-medium text-accent-cyan hover:underline">
                  {c.caseNumber}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-400">{formatSourceType(c.sourceType)}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3"><RiskBadge level={c.riskLevel} score={c.riskScore} /></td>
              <td className="px-4 py-3 text-slate-400">{c.finalDecision ? formatStatus(c.finalDecision) : "—"}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {new Date(c.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

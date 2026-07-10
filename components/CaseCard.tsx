import Link from "next/link";
import type { Case } from "@/lib/schemas/case";
import { StatusBadge } from "./StatusBadge";
import { RiskBadge } from "./RiskBadge";
import { FileText } from "lucide-react";

export function CaseCard({ case: c }: { case: Case }) {
  return (
    <Link href={`/cases/${c.id}`} className="block">
      <div className="card hover:border-accent-cyan/40 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="font-medium text-white">{c.caseNumber}</span>
          </div>
          <StatusBadge status={c.status} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <RiskBadge level={c.riskLevel} score={c.riskScore} />
          <span className="text-xs text-slate-500">{c.sourceType}</span>
        </div>
        {c.finalDecision && (
          <div className="mt-2 text-xs text-slate-400">Decision: {c.finalDecision}</div>
        )}
        <div className="mt-2 text-xs text-slate-500">
          {new Date(c.createdAt).toLocaleString()}
        </div>
      </div>
    </Link>
  );
}

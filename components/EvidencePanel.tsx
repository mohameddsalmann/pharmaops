import type { EvidenceItem } from "@/lib/schemas/agents";
import { FileText, BookOpen, Info } from "lucide-react";
import { formatAgentName } from "@/lib/utils/format";

export function EvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  if (evidence.length === 0) {
    return (
      <div className="card text-center text-slate-400">
        No evidence items retrieved.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="alert-info flex items-center gap-2 text-xs">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>Evidence is from mock local knowledge base.</span>
      </div>
      {evidence.map((e) => (
        <div key={e.id} className="card">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10">
              <FileText className="h-4 w-4 text-accent-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-200">{e.sourceTitle}</span>
                <span className="badge-info">{formatAgentName(e.usedByAgent)}</span>
                <span className="text-xs text-slate-500">Relevance: {(e.relevanceScore * 100).toFixed(0)}%</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">{e.snippet}</p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                <BookOpen className="h-3 w-3" />
                <span>{e.sourceType}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

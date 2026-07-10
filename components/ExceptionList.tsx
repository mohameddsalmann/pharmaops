import type { ExceptionItem } from "@/lib/schemas/agents";
import { AlertTriangle, AlertCircle, Info, ShieldAlert, FileText } from "lucide-react";
import { formatExceptionType, formatSeverity } from "@/lib/utils/format";

const severityConfig: Record<string, { color: string; icon: typeof Info; border: string }> = {
  low: { color: "text-slate-400", icon: Info, border: "border-navy-700/50" },
  medium: { color: "text-status-amber", icon: AlertCircle, border: "border-status-amber/20" },
  high: { color: "text-status-red", icon: AlertTriangle, border: "border-status-red/20" },
  critical: { color: "text-status-red", icon: ShieldAlert, border: "border-status-red/30" },
};

export function ExceptionList({ exceptions }: { exceptions: ExceptionItem[] }) {
  if (exceptions.length === 0) {
    return (
      <div className="card text-center text-slate-400">
        No exceptions detected. All checks passed.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exceptions.map((exc) => {
        const config = severityConfig[exc.severity] ?? severityConfig.medium;
        const Icon = config.icon;
        return (
          <div key={exc.id} className={`card ${config.border}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-800/80`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-200">{formatExceptionType(exc.type)}</span>
                  <span className={`badge ${
                    exc.severity === "critical" ? "badge-danger" :
                    exc.severity === "high" ? "badge-danger" :
                    exc.severity === "medium" ? "badge-warning" : "badge-neutral"
                  }`}>{formatSeverity(exc.severity)}</span>
                  <span className="text-xs text-slate-500">Confidence: {(exc.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{exc.reason}</p>
                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Recommended:</span>
                  <span>{exc.recommendedAction}</span>
                </div>
                {exc.evidenceSource && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <FileText className="h-3 w-3" />
                    <span>Evidence: {exc.evidenceSource}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

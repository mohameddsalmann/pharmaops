import type { SupervisorDecision } from "@/lib/schemas/agents";
import { RiskBadge } from "./RiskBadge";
import { CheckCircle, AlertTriangle, FileQuestion, ShieldAlert, XCircle } from "lucide-react";
import { formatDecision } from "@/lib/utils/format";

const decisionConfig: Record<string, { color: string; icon: typeof CheckCircle; bg: string }> = {
  approved: { color: "text-status-green", icon: CheckCircle, bg: "bg-status-green/10" },
  needs_human_review: { color: "text-status-amber", icon: AlertTriangle, bg: "bg-status-amber/10" },
  missing_information: { color: "text-status-amber", icon: FileQuestion, bg: "bg-status-amber/10" },
  prior_authorization_required: { color: "text-accent-cyan", icon: ShieldAlert, bg: "bg-accent-cyan/10" },
  rejected: { color: "text-status-red", icon: XCircle, bg: "bg-status-red/10" },
  cannot_determine: { color: "text-slate-400", icon: FileQuestion, bg: "bg-navy-800/50" },
};

export function SupervisorDecisionPanel({ decision, riskScore }: { decision: SupervisorDecision | null; riskScore: number | null }) {
  if (!decision) {
    return (
      <div className="card text-center text-slate-400">
        No supervisor decision yet. Run QA to generate a decision.
      </div>
    );
  }

  const config = decisionConfig[decision.decision] ?? decisionConfig.needs_human_review;
  const Icon = config.icon;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Supervisor Decision</h3>
        <RiskBadge level={decision.riskLevel} score={riskScore} />
      </div>

      <div className={`mt-4 flex items-center gap-3 rounded-lg ${config.bg} p-3`}>
        <Icon className={`h-8 w-8 ${config.color}`} />
        <div>
          <div className={`text-lg font-bold ${config.color}`}>{formatDecision(decision.decision)}</div>
          <div className="text-xs text-slate-400">Confidence: {(decision.confidence * 100).toFixed(0)}%</div>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{decision.summary}</p>

      <div className="mt-3 border-t border-navy-700/50 pt-3">
        <div className="text-xs font-medium text-slate-400">Next Action</div>
        <p className="mt-1 text-sm text-slate-200">{decision.nextAction}</p>
      </div>

      {decision.reasons.length > 0 && (
        <div className="mt-3 border-t border-navy-700/50 pt-3">
          <div className="text-xs font-medium text-slate-400">Reasons</div>
          <ul className="mt-1 space-y-1">
            {decision.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {decision.evidenceUsed.length > 0 && (
        <div className="mt-3 border-t border-navy-700/50 pt-3">
          <div className="text-xs font-medium text-slate-400">Evidence Used</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {decision.evidenceUsed.map((e, i) => (
              <span key={i} className="badge-info">{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

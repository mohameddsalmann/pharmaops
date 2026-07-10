import { CheckCircle, AlertTriangle, Clock, XCircle, HelpCircle, FileQuestion } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending_qa: { label: "Pending QA", color: "text-slate-400 bg-slate-700/30", icon: Clock },
  approved: { label: "Approved", color: "text-status-green bg-status-green/10", icon: CheckCircle },
  needs_human_review: { label: "Needs Review", color: "text-status-amber bg-status-amber/10", icon: AlertTriangle },
  missing_information: { label: "Missing Info", color: "text-status-amber bg-status-amber/10", icon: FileQuestion },
  prior_authorization_required: { label: "Prior Auth", color: "text-accent-cyan bg-accent-cyan/10", icon: FileQuestion },
  rejected: { label: "Rejected", color: "text-status-red bg-status-red/10", icon: XCircle },
  cannot_determine: { label: "Cannot Determine", color: "text-slate-400 bg-slate-700/30", icon: HelpCircle },
  in_review: { label: "In Review", color: "text-accent-cyan bg-accent-cyan/10", icon: Clock },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.pending_qa;
  const Icon = config.icon;
  return (
    <span className={`badge ${config.color}`}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </span>
  );
}

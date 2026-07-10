const riskConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low Risk", color: "text-status-green bg-status-green/10" },
  medium: { label: "Medium Risk", color: "text-status-amber bg-status-amber/10" },
  high: { label: "High Risk", color: "text-status-red bg-status-red/10" },
  critical: { label: "Critical Risk", color: "text-status-red bg-status-red/20 border border-status-red/30" },
};

export function RiskBadge({ level, score }: { level: string | null; score?: number | null }) {
  if (!level) return <span className="badge bg-slate-700/30 text-slate-400">No Risk Score</span>;
  const config = riskConfig[level] ?? riskConfig.medium;
  return (
    <span className={`badge ${config.color}`}>
      {config.label}
      {score !== null && score !== undefined && (
        <span className="ml-1 font-mono text-[10px] opacity-70">({score})</span>
      )}
    </span>
  );
}

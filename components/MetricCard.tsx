interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
}

export function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {icon && <span className="text-accent-cyan opacity-70">{icon}</span>}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</div>
      {trend && <div className="mt-1 text-xs text-slate-500">{trend}</div>}
    </div>
  );
}

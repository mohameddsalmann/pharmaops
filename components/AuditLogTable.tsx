import type { AuditLog } from "@/lib/schemas/audit";
import { Bot, User, Settings, Cpu } from "lucide-react";
import { formatActorType } from "@/lib/utils/format";

const actorIcons: Record<string, typeof Bot> = {
  agent: Bot,
  human: User,
  system: Settings,
};

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="card text-center text-slate-400">
        No audit log entries.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-700/60">
      <table className="w-full text-sm">
        <thead className="bg-navy-800/50 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Timestamp</th>
            <th className="px-4 py-3 text-left font-medium">Actor</th>
            <th className="px-4 py-3 text-left font-medium">Action</th>
            <th className="px-4 py-3 text-left font-medium">Confidence</th>
            <th className="px-4 py-3 text-left font-medium">Fallback</th>
            <th className="px-4 py-3 text-left font-medium">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700/40">
          {logs.map((log) => {
            const Icon = actorIcons[log.actorType] ?? Settings;
            const usedFallback = log.details?.usedFallback === true;
            return (
              <tr key={log.id} className="hover:bg-navy-800/30">
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                    <div>
                      <div className="text-xs text-slate-400">{formatActorType(log.actorType)}</div>
                      <div className="text-[10px] text-slate-600">{log.actorName}</div>
                    </div>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{log.action}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {log.confidence !== null ? `${(log.confidence * 100).toFixed(0)}%` : "—"}
                </td>
                <td className="px-4 py-3">
                  {usedFallback ? (
                    <span className="badge-warning">
                      <Cpu className="mr-1 h-3 w-3" /> Yes
                    </span>
                  ) : log.actorType === "agent" ? (
                    <span className="text-xs text-slate-500">No</span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <details className="cursor-pointer">
                    <summary className="text-xs text-slate-500 hover:text-slate-300">View</summary>
                    <pre className="mt-1 overflow-x-auto text-[10px] text-slate-400">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

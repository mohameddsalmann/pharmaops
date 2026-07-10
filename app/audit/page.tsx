import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { PageHeader } from "@/components/PageHeader";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { MetricCard } from "@/components/MetricCard";
import { ScrollText, Bot, User, Settings } from "lucide-react";
import Link from "next/link";

export default async function AuditPage() {
  const store = await getSeededBotOpsStore();
  const logs = await store.getAuditLogs();

  const evaluatorLogs = logs.filter((l) => l.actorType === "evaluator");
  const humanLogs = logs.filter((l) => l.actorType === "human");
  const systemLogs = logs.filter((l) => l.actorType === "system" || l.actorType === "import");

  return (
    <div>
      <PageHeader
        title="BotOps Audit Log"
        description="Complete audit trail of all evaluations, QA reviews, imports, and system actions"
      />

      <PageFadeIn>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total Events" value={logs.length} icon={<ScrollText className="h-5 w-5" />} />
          <MetricCard label="Evaluations" value={evaluatorLogs.length} icon={<Bot className="h-5 w-5" />} />
          <MetricCard label="Human Actions" value={humanLogs.length} icon={<User className="h-5 w-5" />} />
          <MetricCard label="System Events" value={systemLogs.length} icon={<Settings className="h-5 w-5" />} />
        </div>

        <div className="overflow-x-auto rounded-lg border border-navy-700/60 bg-navy-900/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Run</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No audit events yet. Click &quot;Seed Demo Runs&quot; to load sample data.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-navy-800/40">
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-slate-300">{log.actorType}</span>
                      <span className="ml-1 text-xs text-slate-500">{log.actorName}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {log.action.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      {log.botRunId ? (
                        <Link href={`/runs/${log.botRunId}`} className="text-xs text-accent-cyan hover:underline">
                          View
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {log.details && Object.keys(log.details).length > 0
                        ? JSON.stringify(log.details)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageFadeIn>
    </div>
  );
}

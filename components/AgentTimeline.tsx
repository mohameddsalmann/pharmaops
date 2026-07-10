import type { AgentRun } from "@/lib/schemas/agents";
import { AgentRunCard } from "./AgentRunCard";
import { CheckCircle, Loader, XCircle, Cpu, Zap } from "lucide-react";
import { formatAgentName } from "@/lib/utils/format";

export function AgentTimeline({ runs }: { runs: AgentRun[] }) {
  if (runs.length === 0) {
    return (
      <div className="card text-center text-slate-400">
        No agent runs yet. Run QA to start the pipeline.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run, idx) => {
        const label = formatAgentName(run.agentName);
        const Icon = run.status === "completed" ? CheckCircle : run.status === "failed" ? XCircle : Loader;
        return (
          <div key={run.id} className="relative flex gap-3" style={{ animationDelay: `${idx * 60}ms` }}>
            {idx < runs.length - 1 && (
              <div className="absolute left-4 top-10 h-full w-px bg-navy-700" />
            )}
            <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-navy-600 bg-navy-800">
              <Icon className={`h-4 w-4 ${
                run.status === "completed" ? "text-status-green" :
                run.status === "failed" ? "text-status-red" : "text-slate-400"
              }`} />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{label}</span>
                {run.usedFallback ? (
                  <span className="badge-neutral">
                    <Cpu className="mr-1 h-3 w-3" /> Deterministic fallback used
                  </span>
                ) : (
                  <span className="badge-cyan">
                    <Zap className="mr-1 h-3 w-3" /> LLM
                  </span>
                )}
              </div>
              <AgentRunCard run={run} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

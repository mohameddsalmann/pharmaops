import type { AgentRun } from "@/lib/schemas/agents";

export function AgentRunCard({ run }: { run: AgentRun }) {
  return (
    <div className="card py-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {run.confidence !== null && (
          <span>Confidence: <span className="font-mono text-slate-300">{(run.confidence * 100).toFixed(0)}%</span></span>
        )}
        {run.latencyMs !== null && run.latencyMs > 0 && (
          <span>Latency: <span className="font-mono text-slate-300">{run.latencyMs}ms</span></span>
        )}
        {run.provider && <span>Provider: <span className="text-slate-300">{run.provider}</span></span>}
        {run.model && <span>Model: <span className="text-slate-300">{run.model}</span></span>}
        {run.error && <span className="text-status-amber">Error: {run.error}</span>}
      </div>
      {run.output && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">View output JSON</summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-navy-950 p-2 font-mono text-[10px] text-slate-400">
            {JSON.stringify(run.output, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

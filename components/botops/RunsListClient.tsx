"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { BotRun } from "@/lib/schemas/bot-run";
import { BotRunTable } from "./BotRunTable";
import { formatWorkflowType } from "@/lib/utils/format";
import { Search, Filter } from "lucide-react";

export function RunsListClient({ initialRuns }: { initialRuns: BotRun[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");

  const filteredRuns = useMemo(() => {
    let runs = [...initialRuns];
    if (search) {
      const q = search.toLowerCase();
      runs = runs.filter(
        (r) =>
          r.runNumber.toLowerCase().includes(q) ||
          r.pharmacyName.toLowerCase().includes(q) ||
          r.finalOutcome.toLowerCase().includes(q)
      );
    }
    if (statusFilter) runs = runs.filter((r) => r.executionStatus === statusFilter);
    if (decisionFilter) runs = runs.filter((r) => r.decision === decisionFilter);
    if (workflowFilter) runs = runs.filter((r) => r.workflowType === workflowFilter);
    return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [initialRuns, search, statusFilter, decisionFilter, workflowFilter]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (decisionFilter) params.set("decision", decisionFilter);
    if (workflowFilter) params.set("workflowType", workflowFilter);
    router.push(`/runs?${params.toString()}`);
  }

  const workflowTypes = useMemo(() => [...new Set(initialRuns.map((r) => r.workflowType))], [initialRuns]);

  return (
    <div className="mt-6 space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-400">Search</label>
            <div className="mt-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                className="w-full rounded border border-navy-600 bg-navy-850 pl-9 pr-3 py-1.5 text-sm text-slate-200 focus:border-accent-cyan focus:outline-none"
                placeholder="Run #, pharmacy, outcome..."
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 rounded border border-navy-600 bg-navy-850 px-3 py-1.5 text-sm text-slate-200 focus:border-accent-cyan focus:outline-none"
            >
              <option value="">All</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="stalled">Stalled</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Decision</label>
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="mt-1 rounded border border-navy-600 bg-navy-850 px-3 py-1.5 text-sm text-slate-200 focus:border-accent-cyan focus:outline-none"
            >
              <option value="">All</option>
              <option value="safe_to_automate">Safe to Automate</option>
              <option value="needs_qa_review">Needs QA Review</option>
              <option value="regression_detected">Regression Detected</option>
              <option value="ui_drift_detected">UI Drift Detected</option>
              <option value="stop_automation">Stop Automation</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Workflow</label>
            <select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              className="mt-1 rounded border border-navy-600 bg-navy-850 px-3 py-1.5 text-sm text-slate-200 focus:border-accent-cyan focus:outline-none"
            >
              <option value="">All</option>
              {workflowTypes.map((w) => (
                <option key={w} value={w}>
                  {formatWorkflowType(w)}
                </option>
              ))}
            </select>
          </div>
          <button onClick={applyFilters} className="btn-primary btn-sm">
            <Filter className="h-4 w-4" /> Apply
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing {filteredRuns.length} of {initialRuns.length} runs
      </div>

      <BotRunTable runs={filteredRuns} />
    </div>
  );
}

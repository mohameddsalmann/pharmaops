"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BotRunDetail, QaReviewAction, QaReviewActionType } from "@/lib/schemas/bot-run";
import { RunDecisionPanel } from "./RunDecisionPanel";
import { EvaluatorResultCard } from "./EvaluatorResultCard";
import { BotReplayTimeline } from "./BotReplayTimeline";
import { FieldComparisonTable } from "./FieldComparisonTable";
import { QAReviewActions } from "./QAReviewActions";
import { formatWorkflowType, formatPmsType, formatEnvironment } from "@/lib/utils/format";
import { PlayCircle, Lock, AlertTriangle, Activity, Loader2 } from "lucide-react";
import { isProduction } from "@/lib/utils/env";

export function RunDetailClient({ detail }: { detail: BotRunDetail }) {
  const [evaluating, setEvaluating] = useState(false);
  const [currentDetail, setCurrentDetail] = useState(detail);
  const [reviewActions, setReviewActions] = useState<QaReviewAction[]>(detail.qaReviewActions);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLive = currentDetail.status === "running" || currentDetail.status === "evaluating";

  const pollRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/botops/runs/${currentDetail.id}`, { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.run) {
        setCurrentDetail((prev) => ({
          ...data.run,
          qaReviewActions: prev.qaReviewActions,
          auditLogs: data.run.auditLogs ?? prev.auditLogs,
        }));
        setReviewActions(data.run.qaReviewActions ?? []);
      }
    } catch {
      // silent poll failure
    }
  }, [currentDetail.id]);

  useEffect(() => {
    setCurrentDetail(detail);
    setReviewActions(detail.qaReviewActions);
  }, [detail]);

  useEffect(() => {
    if (isLive) {
      pollingRef.current = setInterval(pollRun, 1500);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [isLive, pollRun]);

  async function handleEvaluate() {
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch(`/api/botops/runs/${currentDetail.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useLlm: false }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json();
      setCurrentDetail({
        ...currentDetail,
        ...data.run,
        events: currentDetail.events,
        evaluatorResults: data.evaluatorResults,
        fieldComparisons: data.fieldComparisons,
        summary: {
          botRunId: currentDetail.id,
          summary: data.summary,
          reviewerNote: data.reviewerNote,
          engineeringExplanation: data.engineeringExplanation,
          usedLlm: data.usedLlm,
          createdAt: new Date().toISOString(),
        },
        qaReviewActions: reviewActions,
        auditLogs: currentDetail.auditLogs,
        baseline: currentDetail.baseline,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setEvaluating(false);
    }
  }

  async function handleReviewAction(data: {
    botRunId: string;
    reviewerName: string;
    action: QaReviewActionType;
    note: string;
  }) {
    const res = await fetch("/api/botops/qa-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to submit review action");
    const result = await res.json();
    setReviewActions([...reviewActions, result.action]);
  }

  const run = currentDetail;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[1.75rem] font-bold tracking-tight text-white">{run.runNumber}</h1>
            {run.status === "running" && (
              <span className="flex items-center gap-1.5 rounded-full bg-accent-cyan/10 px-2.5 py-1 text-[10px] font-medium text-accent-cyan">
                <Activity className="h-3 w-3 animate-pulse" /> LIVE
              </span>
            )}
            {run.status === "evaluating" && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
                <Loader2 className="h-3 w-3 animate-spin" /> EVALUATING
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span>{run.pharmacyName}</span>
            <span className="text-slate-600">·</span>
            <span>{formatWorkflowType(run.workflowType)}</span>
            <span className="text-slate-600">·</span>
            <span>{formatPmsType(run.pmsType)}</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono-data">Bot v{run.botVersion}</span>
            <span className="text-slate-600">·</span>
            <span>{formatEnvironment(run.environment)}</span>
          </div>
        </div>
        <button
          onClick={handleEvaluate}
          disabled={evaluating}
          className="btn-primary btn-sm"
        >
          <PlayCircle className="h-4 w-4" />
          {evaluating ? "Evaluating..." : "Re-evaluate"}
        </button>
      </div>

      {error && (
        <div className="alert-danger flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {run.containsPhi && (
        <div className="alert-warning flex items-center gap-2 text-sm">
          <Lock className="h-4 w-4" /> This run may contain PHI — redaction was applied before evaluation.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — Decision & Summary */}
        <div className="space-y-4">
          <RunDecisionPanel run={run} />
          {run.summary && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-white">Summary</h3>
              <p className="text-xs text-slate-300">{run.summary.summary}</p>
              {run.summary.reviewerNote && (
                <div className="mt-3 border-t border-navy-700/40 pt-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Reviewer Note</div>
                  <p className="mt-0.5 text-xs text-slate-300">{run.summary.reviewerNote}</p>
                </div>
              )}
              {run.summary.engineeringExplanation && (
                <div className="mt-2 border-t border-navy-700/40 pt-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Engineering Explanation</div>
                  <p className="mt-0.5 text-xs text-slate-300">{run.summary.engineeringExplanation}</p>
                </div>
              )}
              <div className="mt-2 font-mono-data text-[10px] text-slate-500">
                {run.summary.usedLlm ? "LLM-assisted summary" : "Deterministic summary"}
              </div>
            </div>
          )}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">QA Review Actions</h3>
            {isProduction() ? (
              <div className="flex items-center gap-2 rounded-lg bg-navy-800/40 px-3 py-3 text-sm text-slate-600">
                <Lock className="h-4 w-4" />
                Enterprise authentication required — QA review actions are read-only in the public demo.
              </div>
            ) : (
              <QAReviewActions
                runId={run.id}
                actions={reviewActions}
                onAction={handleReviewAction}
              />
            )}
          </div>
        </div>

        {/* Middle column — Evaluator Results */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Evaluator Results</h3>
          {run.evaluatorResults.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400">
              No evaluator results yet. Click &quot;Re-evaluate&quot; to run evaluators.
            </div>
          ) : (
            run.evaluatorResults.map((result) => (
              <EvaluatorResultCard key={result.id} result={result} />
            ))
          )}
          {run.fieldComparisons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white">Field Comparisons</h4>
              <FieldComparisonTable comparisons={run.fieldComparisons} />
            </div>
          )}
        </div>

        {/* Right column — Replay Timeline */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Replay Timeline</h3>
          <div className="card-bezel max-h-[800px] overflow-y-auto p-1.5">
            <div className="card-bezel-inner p-4">
              <BotReplayTimeline events={run.events} isLive={isLive} />
            </div>
          </div>
        </div>
      </div>

      {/* Audit logs */}
      {run.auditLogs.length > 0 && (
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-white">Audit Trail</h3>
          <div className="space-y-2">
            {run.auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-navy-800/60 pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-slate-500">{log.actorType}</span>
                  <span className="text-slate-300">{log.actorName}</span>
                  <span className="text-slate-400">{log.action.replace(/_/g, " ")}</span>
                </div>
                <span className="font-mono-data text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

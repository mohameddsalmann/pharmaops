"use client";

import { useState } from "react";
import type { QaReviewAction, QaReviewActionType } from "@/lib/schemas/bot-run";
import { formatQaReviewAction } from "@/lib/utils/format";

const actionTypes: QaReviewActionType[] = [
  "approve_for_automation",
  "hold_for_review",
  "block_automation",
  "flag_regression",
  "flag_drift",
  "assign_reviewer",
];

export function QAReviewActions({
  runId,
  actions,
  onAction,
}: {
  runId: string;
  actions: QaReviewAction[];
  onAction: (data: { botRunId: string; reviewerName: string; action: QaReviewActionType; note: string }) => Promise<void>;
}) {
  const [reviewerName, setReviewerName] = useState("");
  const [action, setAction] = useState<QaReviewActionType>("hold_for_review");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewerName.trim()) return;
    setSubmitting(true);
    try {
      await onAction({ botRunId: runId, reviewerName, action, note });
      setNote("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-navy-700/60 bg-navy-900/50 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-400">Reviewer Name</label>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="input mt-1"
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as QaReviewActionType)}
              className="input mt-1"
            >
              {actionTypes.map((a) => (
                <option key={a} value={a}>
                  {formatQaReviewAction(a)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input mt-1"
            rows={2}
            placeholder="Optional note..."
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary btn-sm">
          {submitting ? "Submitting..." : "Submit Review Action"}
        </button>
      </form>

      <div className="space-y-2">
        {actions.length === 0 ? (
          <p className="text-xs text-slate-500">No review actions recorded yet.</p>
        ) : (
          actions.map((a) => (
            <div key={a.id} className="rounded border border-navy-700/60 bg-navy-900/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">{formatQaReviewAction(a.action)}</span>
                <span className="font-mono-data text-[10px] text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">by {a.reviewerName}</div>
              {a.note && <p className="mt-1 text-xs text-slate-300">{a.note}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

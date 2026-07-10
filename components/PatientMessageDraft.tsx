"use client";

import { useState } from "react";
import type { PatientMessageDraft as Draft } from "@/lib/schemas/agents";
import { MessageSquare, Lock, AlertTriangle } from "lucide-react";
import { isProduction } from "@/lib/utils/env";

interface PatientMessageDraftProps {
  draft: Draft;
  caseId: string;
  onGenerate: (messageType: string, channel: string) => Promise<void>;
}

export function PatientMessageDraft({ draft, caseId, onGenerate }: PatientMessageDraftProps) {
  const [loading, setLoading] = useState(false);
  const [messageType, setMessageType] = useState("review_pending");
  const [channel, setChannel] = useState("sms");

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await onGenerate(messageType, channel);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-accent-cyan" />
        <h3 className="text-sm font-medium text-slate-300">Patient Message Draft</h3>
      </div>

      {draft ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="badge bg-navy-700/50 text-slate-400">{draft.messageType.replace(/_/g, " ")}</span>
            <span className="badge bg-navy-700/50 text-slate-400">{draft.channel}</span>
            <span className="badge bg-status-amber/10 text-status-amber flex items-center gap-1">
              <Lock className="h-3 w-3" /> Requires Approval
            </span>
          </div>
          <div className="rounded-md bg-navy-950 p-3 text-sm text-slate-300">
            {draft.body}
          </div>
          {draft.safetyNotes.length > 0 && (
            <div className="mt-2 space-y-1">
              {draft.safetyNotes.map((note, i) => (
                <div key={i} className="flex items-center gap-1 text-xs text-status-amber">
                  <AlertTriangle className="h-3 w-3" />
                  {note}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 border-t border-navy-700 pt-3">
            {isProduction() ? (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Lock className="h-3 w-3" />
                Enterprise authentication required to generate drafts.
              </div>
            ) : (
              <>
              <div className="text-xs text-slate-400 mb-2">Generate new draft:</div>
              <div className="flex flex-wrap items-center gap-2">
              <select className="input w-auto" value={messageType} onChange={(e) => setMessageType(e.target.value)}>
                <option value="review_pending">Review Pending</option>
                <option value="missing_information">Missing Information</option>
                <option value="prior_authorization">Prior Authorization</option>
                <option value="refill_status">Refill Status</option>
                <option value="general_update">General Update</option>
              </select>
              <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="sms">SMS</option>
                <option value="call_script">Call Script</option>
                <option value="email">Email</option>
              </select>
              <button onClick={handleGenerate} disabled={loading} className="btn-secondary">
                {loading ? "Generating..." : "Generate Draft"}
              </button>
              </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div>
          {isProduction() ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Lock className="h-4 w-4" />
              Enterprise authentication required to generate drafts.
            </div>
          ) : (
            <>
          <p className="text-sm text-slate-400 mb-3">No message draft yet. Generate one below:</p>
          <div className="flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={messageType} onChange={(e) => setMessageType(e.target.value)}>
              <option value="review_pending">Review Pending</option>
              <option value="missing_information">Missing Information</option>
              <option value="prior_authorization">Prior Authorization</option>
              <option value="refill_status">Refill Status</option>
              <option value="general_update">General Update</option>
            </select>
            <select className="input w-auto" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="sms">SMS</option>
              <option value="call_script">Call Script</option>
              <option value="email">Email</option>
            </select>
            <button onClick={handleGenerate} disabled={loading} className="btn-secondary">
              {loading ? "Generating..." : "Generate Draft"}
            </button>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
}

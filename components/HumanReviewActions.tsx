"use client";

import { useState } from "react";
import { useRole } from "@/lib/roles/role-context";
import { Check, X, FileQuestion, Send } from "lucide-react";

interface HumanReviewActionsProps {
  caseId: string;
  caseStatus: string;
  onAction: (action: string, note: string) => Promise<void>;
}

export function HumanReviewActions({ onAction }: HumanReviewActionsProps) {
  const { roleInfo } = useRole();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!roleInfo.canReview) {
    return (
      <div className="card text-center text-sm text-slate-400">
        Switch to <span className="text-accent-cyan">Pharmacist Reviewer</span> role to perform review actions.
      </div>
    );
  }

  const actions = [
    { type: "approve", label: "Approve", icon: Check, className: "btn-success", disabled: !roleInfo.canApprove },
    { type: "reject", label: "Reject", icon: X, className: "btn-danger", disabled: !roleInfo.canReject },
    { type: "request_info", label: "Request Info", icon: FileQuestion, className: "btn-secondary", disabled: !roleInfo.canRequestInfo },
    { type: "send_to_prior_auth", label: "Send to Prior Auth", icon: Send, className: "btn-secondary", disabled: !roleInfo.canSendToPriorAuth },
  ];

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      await onAction(action, note);
      setNote("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-medium text-slate-300">Human Review Actions</h3>
      <textarea
        className="input mb-3 min-h-[60px]"
        placeholder="Add a review note (optional)..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.type}
              onClick={() => handleAction(a.type)}
              disabled={a.disabled || loading}
              className={a.className}
            >
              <Icon className="h-4 w-4" />
              {a.label}
            </button>
          );
        })}
      </div>
      {loading && <div className="mt-2 text-xs text-slate-400">Processing...</div>}
    </div>
  );
}

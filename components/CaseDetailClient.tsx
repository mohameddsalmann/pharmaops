"use client";

import { useRouter } from "next/navigation";
import { HumanReviewActions } from "@/components/HumanReviewActions";
import { PatientMessageDraft } from "@/components/PatientMessageDraft";
import type { PatientMessageDraft as Draft } from "@/lib/schemas/agents";
import { isProduction } from "@/lib/utils/env";
import { Lock } from "lucide-react";

interface CaseDetailClientProps {
  caseId: string;
  caseStatus: string;
  messageDrafts: Draft[];
}

export function CaseDetailClient({ caseId, caseStatus, messageDrafts }: CaseDetailClientProps) {
  const router = useRouter();

  const handleReviewAction = async (action: string, note: string) => {
    const res = await fetch(`/api/cases/${caseId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notes: note }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Review action failed");
    }
    router.refresh();
  };

  const handleGenerateMessage = async (messageType: string, channel: string) => {
    const res = await fetch(`/api/cases/${caseId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageType, channel }),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || "Message generation failed");
    }
    router.refresh();
  };

  return (
    <>
      {(caseStatus === "needs_human_review" || caseStatus === "in_review") &&
        (isProduction() ? (
          <div className="card flex items-center gap-2 text-sm text-slate-600">
            <Lock className="h-4 w-4" />
            Enterprise authentication required — review actions are read-only in the public demo.
          </div>
        ) : (
          <HumanReviewActions
            caseId={caseId}
            caseStatus={caseStatus}
            onAction={handleReviewAction}
          />
        ))}
      {messageDrafts.length > 0 && (
        <div className="grid gap-4">
          {messageDrafts.map((draft) => (
            <PatientMessageDraft
              key={draft.id ?? draft.caseId + draft.messageType}
              draft={draft}
              caseId={caseId}
              onGenerate={handleGenerateMessage}
            />
          ))}
        </div>
      )}
    </>
  );
}

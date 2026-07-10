import { notFound } from "next/navigation";
import { getSeededStore } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { RiskBadge } from "@/components/RiskBadge";
import { PrescriptionViewer } from "@/components/PrescriptionViewer";
import { ExtractedFieldsPanel } from "@/components/ExtractedFieldsPanel";
import { AgentTimeline } from "@/components/AgentTimeline";
import { AgentRunCard } from "@/components/AgentRunCard";
import { ExceptionList } from "@/components/ExceptionList";
import { SupervisorDecisionPanel } from "@/components/SupervisorDecisionPanel";
import { EvidencePanel } from "@/components/EvidencePanel";
import { AuditLogTable } from "@/components/AuditLogTable";
import { CaseDetailClient } from "@/components/CaseDetailClient";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { formatSourceType, formatStatus, formatActionType } from "@/lib/utils/format";
import type { ExtractedPrescription, SupervisorDecision } from "@/lib/schemas/agents";
import Link from "next/link";
import { ArrowLeft, FileText, User, Shield, Clock, Hash } from "lucide-react";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const store = await getSeededStore();
  const detail = await store.getCaseDetail(caseId);

  if (!detail) {
    notFound();
    return;
  }

  const intakeRun = detail.agentRuns.find(
    (r) => r.agentName === "intake_extraction"
  );
  const extraction = intakeRun?.output as ExtractedPrescription | null;

  const supervisorRun = detail.agentRuns.find(
    (r) => r.agentName === "supervisor_decision"
  );
  const supervisorDecision = supervisorRun?.output as SupervisorDecision | null;

  const prescriptionInput = detail.prescriptionInput;
  const patientProfile = prescriptionInput?.patientProfile;
  const insuranceProfile = prescriptionInput?.insuranceProfile;

  return (
    <div>
      <Link
        href="/review"
        className="mb-4 inline-flex items-center gap-1 text-sm text-accent-cyan hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Review Queue
      </Link>

      <PageHeader
        title={`Case ${detail.caseNumber}`}
        description={`${formatSourceType(detail.sourceType)} · Created ${new Date(detail.createdAt).toLocaleString()}`}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={detail.status} />
        <RiskBadge level={detail.riskLevel} score={detail.riskScore} />
        {detail.finalDecision && (
          <span className="badge-info">
            Decision: {formatStatus(detail.finalDecision)}
          </span>
        )}
      </div>

      <PageFadeIn>
        {/* 3-column layout on desktop */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Prescription Input */}
          <div className="space-y-4">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4 text-accent-cyan" />
                Prescription Input
              </h2>
              <div className="card space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Hash className="h-3 w-3" />
                    <span>Case ID:</span>
                    <span className="font-mono text-slate-300">{detail.caseNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(detail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <PrescriptionViewer
                  text={prescriptionInput?.prescriptionText ?? "No prescription text available"}
                />
              </div>
            </div>

            {/* Patient Profile */}
            {patientProfile && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <User className="h-3.5 w-3.5" />
                  Synthetic Patient Profile
                </h3>
                <div className="card space-y-1.5 text-xs">
                  <ProfileRow label="Name" value={patientProfile.name} />
                  <ProfileRow label="Date of Birth" value={patientProfile.dateOfBirth} />
                  <ProfileRow label="Address" value={patientProfile.address} />
                  <ProfileRow label="Phone" value={patientProfile.phone} />
                  <ProfileRow label="Insurance Member ID" value={patientProfile.insuranceMemberId} />
                </div>
              </div>
            )}

            {/* Insurance Profile */}
            {insuranceProfile && (
              <div>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Shield className="h-3.5 w-3.5" />
                  Insurance Profile
                </h3>
                <div className="card space-y-1.5 text-xs">
                  <ProfileRow label="Plan" value={insuranceProfile.planName} />
                  <ProfileRow label="Member ID" value={insuranceProfile.memberId} />
                  <ProfileRow label="Group Number" value={insuranceProfile.groupNumber} />
                  <ProfileRow label="Active" value={insuranceProfile.active ? "Yes" : "No"} />
                  {insuranceProfile.priorAuthRequiredMeds && insuranceProfile.priorAuthRequiredMeds.length > 0 && (
                    <div className="pt-1">
                      <div className="text-slate-500">Prior Auth Required Meds:</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {insuranceProfile.priorAuthRequiredMeds.map((med: string, i: number) => (
                          <span key={i} className="badge-warning">{med}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Middle: Agent Pipeline */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Clock className="h-4 w-4 text-accent-cyan" />
              Agent Pipeline
            </h2>
            <AgentTimeline runs={detail.agentRuns} />
            <div className="mt-4 space-y-3">
              {detail.agentRuns.map((run) => (
                <AgentRunCard key={run.id} run={run} />
              ))}
            </div>
          </div>

          {/* Right: Decision Panel */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <FileText className="h-4 w-4 text-accent-cyan" />
              Decision Panel
            </h2>
            <SupervisorDecisionPanel
              decision={supervisorDecision}
              riskScore={detail.riskScore}
            />
            <CaseDetailClient
              caseId={detail.id}
              caseStatus={detail.status}
              messageDrafts={detail.messageDrafts}
            />
          </div>
        </div>

        {/* Below: Extracted Fields */}
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Extracted Fields</h2>
          {extraction ? (
            <ExtractedFieldsPanel extraction={extraction} patientProfile={patientProfile} />
          ) : (
            <div className="card text-center text-sm text-slate-400">
              No extraction data available. Run QA to extract fields.
            </div>
          )}
        </div>

        {/* Exceptions */}
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Exceptions</h2>
          <ExceptionList exceptions={detail.exceptions} />
        </div>

        {/* Evidence */}
        {detail.evidence.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Evidence</h2>
            <EvidencePanel evidence={detail.evidence} />
          </div>
        )}

        {/* Review History */}
        {detail.reviewActions.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-white">Review History</h2>
            <div className="space-y-2">
              {detail.reviewActions.map((action) => (
                <div key={action.id} className="card text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{formatActionType(action.action)}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(action.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {action.note && (
                    <p className="mt-1 text-xs text-slate-400">{action.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Audit Trail</h2>
          <AuditLogTable logs={detail.auditLogs} />
        </div>
      </PageFadeIn>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-500">{label}:</span>
      <span className={`text-right ${value ? "text-slate-300" : "text-slate-600 italic"}`}>
        {value ?? "Not provided"}
      </span>
    </div>
  );
}

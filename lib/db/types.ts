import type { Case, PrescriptionInput, CaseStatus } from "@/lib/schemas/case";
import type { AgentRun, EvidenceItem, ExceptionItem } from "@/lib/schemas/agents";
import type { ReviewAction } from "@/lib/schemas/review";
import type { AuditLog } from "@/lib/schemas/audit";
import type { PatientMessageDraft } from "@/lib/schemas/agents";

export interface CaseFilters {
  status?: string;
  riskLevel?: string;
  decision?: string;
  search?: string;
}

export interface AuditFilters {
  caseId?: string;
  actorType?: string;
  action?: string;
}

export interface CaseDetail extends Case {
  prescriptionInput: PrescriptionInput | null;
  agentRuns: AgentRun[];
  exceptions: ExceptionItem[];
  evidence: EvidenceItem[];
  auditLogs: AuditLog[];
  reviewActions: ReviewAction[];
  messageDrafts: PatientMessageDraft[];
}

export interface DemoStore {
  createCase(input: {
    sourceType: string;
    prescriptionText: string;
    patientProfile: Record<string, unknown>;
    insuranceProfile: Record<string, unknown>;
  }): Promise<Case>;
  getCase(caseId: string): Promise<Case | null>;
  getCaseDetail(caseId: string): Promise<CaseDetail | null>;
  listCases(filters?: CaseFilters): Promise<Case[]>;
  updateCase(
    caseId: string,
    updates: Partial<Pick<Case, "status" | "riskLevel" | "riskScore" | "finalDecision" | "assignedReviewer" | "qaRunInProgress" | "updatedAt">>
  ): Promise<Case | null>;
  saveAgentRun(run: Omit<AgentRun, "id">): Promise<AgentRun>;
  updateAgentRun(id: string, updates: Partial<AgentRun>): Promise<AgentRun | null>;
  listAgentRuns(caseId: string): Promise<AgentRun[]>;
  saveExceptions(caseId: string, exceptions: ExceptionItem[]): Promise<void>;
  listExceptions(caseId: string): Promise<ExceptionItem[]>;
  saveEvidence(items: Omit<EvidenceItem, "id" | "createdAt">[]): Promise<void>;
  listEvidence(caseId: string): Promise<EvidenceItem[]>;
  appendAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog>;
  listAuditLogs(filters?: AuditFilters): Promise<AuditLog[]>;
  saveReviewAction(action: Omit<ReviewAction, "id" | "createdAt">): Promise<ReviewAction>;
  listReviewActions(caseId: string): Promise<ReviewAction[]>;
  saveMessageDraft(draft: Omit<PatientMessageDraft, "id"> & { id?: string }): Promise<PatientMessageDraft>;
  listMessageDrafts(caseId: string): Promise<PatientMessageDraft[]>;
  getPrescriptionInput(caseId: string): Promise<PrescriptionInput | null>;
  seedDemoData(): Promise<void>;
  resetDemoData(): Promise<void>;
}

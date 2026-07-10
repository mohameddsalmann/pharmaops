import type { DemoStore, CaseFilters, AuditFilters, CaseDetail } from "./types";
import type { Case, PrescriptionInput } from "@/lib/schemas/case";
import type { AgentRun, EvidenceItem, ExceptionItem, PatientMessageDraft } from "@/lib/schemas/agents";
import type { ReviewAction } from "@/lib/schemas/review";
import type { AuditLog } from "@/lib/schemas/audit";
import { generateId, nowISO, caseNumberFromIndex } from "@/lib/utils/id";
import { sampleCases } from "@/lib/mock/sample-cases";

class MemoryStore implements DemoStore {
  private cases: Map<string, Case> = new Map();
  private prescriptionInputs: Map<string, PrescriptionInput> = new Map();
  private agentRuns: AgentRun[] = [];
  private exceptions: Map<string, ExceptionItem[]> = new Map();
  private evidence: EvidenceItem[] = [];
  private auditLogs: AuditLog[] = [];
  private reviewActions: ReviewAction[] = [];
  private messageDrafts: Map<string, PatientMessageDraft[]> = new Map();
  private caseCounter = 0;
  private seeded = false;

  async createCase(input: {
    sourceType: string;
    prescriptionText: string;
    patientProfile: Record<string, unknown>;
    insuranceProfile: Record<string, unknown>;
  }): Promise<Case> {
    const id = generateId();
    const caseNumber = caseNumberFromIndex(this.caseCounter++);
    const now = nowISO();
    const newCase: Case = {
      id,
      caseNumber,
      sourceType: input.sourceType as Case["sourceType"],
      status: "pending_qa",
      riskLevel: null,
      riskScore: null,
      finalDecision: null,
      createdAt: now,
      updatedAt: now,
      createdBy: "demo-user",
      assignedReviewer: null,
      qaRunInProgress: false,
    };
    this.cases.set(id, newCase);

    const rxInput: PrescriptionInput = {
      id: generateId(),
      caseId: id,
      prescriptionText: input.prescriptionText,
      patientProfile: input.patientProfile as PrescriptionInput["patientProfile"],
      insuranceProfile: input.insuranceProfile as PrescriptionInput["insuranceProfile"],
      createdAt: now,
    };
    this.prescriptionInputs.set(id, rxInput);

    await this.appendAuditLog({
      caseId: id,
      actorType: "system",
      actorName: "System",
      action: "case_created",
      details: { sourceType: input.sourceType, caseNumber },
      confidence: null,
    });

    return newCase;
  }

  async getCase(caseId: string): Promise<Case | null> {
    return this.cases.get(caseId) ?? null;
  }

  async getCaseDetail(caseId: string): Promise<CaseDetail | null> {
    const c = this.cases.get(caseId);
    if (!c) return null;
    return {
      ...c,
      prescriptionInput: this.prescriptionInputs.get(caseId) ?? null,
      agentRuns: this.agentRuns.filter((r) => r.caseId === caseId),
      exceptions: this.exceptions.get(caseId) ?? [],
      evidence: this.evidence.filter((e) => e.caseId === caseId),
      auditLogs: this.auditLogs.filter((l) => l.caseId === caseId),
      reviewActions: this.reviewActions.filter((r) => r.caseId === caseId),
      messageDrafts: this.messageDrafts.get(caseId) ?? [],
    };
  }

  async listCases(filters?: CaseFilters): Promise<Case[]> {
    let result = Array.from(this.cases.values());
    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    if (filters?.riskLevel) {
      result = result.filter((c) => c.riskLevel === filters.riskLevel);
    }
    if (filters?.decision) {
      result = result.filter((c) => c.finalDecision === filters.decision);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateCase(
    caseId: string,
    updates: Partial<Pick<Case, "status" | "riskLevel" | "riskScore" | "finalDecision" | "assignedReviewer" | "qaRunInProgress" | "updatedAt">>
  ): Promise<Case | null> {
    const c = this.cases.get(caseId);
    if (!c) return null;
    const updated = { ...c, ...updates, updatedAt: nowISO() };
    this.cases.set(caseId, updated);
    return updated;
  }

  async saveAgentRun(run: Omit<AgentRun, "id">): Promise<AgentRun> {
    const full: AgentRun = { ...run, id: generateId() };
    this.agentRuns.push(full);
    return full;
  }

  async updateAgentRun(id: string, updates: Partial<AgentRun>): Promise<AgentRun | null> {
    const idx = this.agentRuns.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.agentRuns[idx] = { ...this.agentRuns[idx], ...updates };
    return this.agentRuns[idx];
  }

  async listAgentRuns(caseId: string): Promise<AgentRun[]> {
    return this.agentRuns
      .filter((r) => r.caseId === caseId)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }

  async saveExceptions(caseId: string, exceptions: ExceptionItem[]): Promise<void> {
    this.exceptions.set(caseId, exceptions);
  }

  async listExceptions(caseId: string): Promise<ExceptionItem[]> {
    return this.exceptions.get(caseId) ?? [];
  }

  async saveEvidence(items: Omit<EvidenceItem, "id" | "createdAt">[]): Promise<void> {
    for (const item of items) {
      this.evidence.push({ ...item, id: generateId(), createdAt: nowISO() });
    }
  }

  async listEvidence(caseId: string): Promise<EvidenceItem[]> {
    return this.evidence.filter((e) => e.caseId === caseId);
  }

  async appendAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
    const full: AuditLog = { ...log, id: generateId(), createdAt: nowISO() };
    this.auditLogs.push(full);
    return full;
  }

  async listAuditLogs(filters?: AuditFilters): Promise<AuditLog[]> {
    let result = this.auditLogs;
    if (filters?.caseId) {
      result = result.filter((l) => l.caseId === filters.caseId);
    }
    if (filters?.actorType) {
      result = result.filter((l) => l.actorType === filters.actorType);
    }
    if (filters?.action) {
      result = result.filter((l) => l.action === filters.action);
    }
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async saveReviewAction(action: Omit<ReviewAction, "id" | "createdAt">): Promise<ReviewAction> {
    const full: ReviewAction = { ...action, id: generateId(), createdAt: nowISO() };
    this.reviewActions.push(full);
    return full;
  }

  async listReviewActions(caseId: string): Promise<ReviewAction[]> {
    return this.reviewActions
      .filter((r) => r.caseId === caseId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async saveMessageDraft(draft: Omit<PatientMessageDraft, "id"> & { id?: string }): Promise<PatientMessageDraft> {
    const full: PatientMessageDraft = { ...draft, id: draft.id ?? generateId() };
    const list = this.messageDrafts.get(full.caseId) ?? [];
    list.push(full);
    this.messageDrafts.set(full.caseId, list);
    return full;
  }

  async listMessageDrafts(caseId: string): Promise<PatientMessageDraft[]> {
    return this.messageDrafts.get(caseId) ?? [];
  }

  async getPrescriptionInput(caseId: string): Promise<PrescriptionInput | null> {
    return this.prescriptionInputs.get(caseId) ?? null;
  }

  async seedDemoData(): Promise<void> {
    if (this.seeded) return;
    this.seeded = true;
    for (const sc of sampleCases) {
      const c = await this.createCase({
        sourceType: sc.sourceType,
        prescriptionText: sc.prescriptionText,
        patientProfile: sc.patientProfile,
        insuranceProfile: sc.insuranceProfile,
      });
      void c;
    }
  }

  async resetDemoData(): Promise<void> {
    this.cases.clear();
    this.prescriptionInputs.clear();
    this.agentRuns = [];
    this.exceptions.clear();
    this.evidence = [];
    this.auditLogs = [];
    this.reviewActions = [];
    this.messageDrafts.clear();
    this.caseCounter = 0;
    this.seeded = false;
    await this.seedDemoData();
  }
}

let storeInstance: MemoryStore | null = null;

export function getMemoryStore(): MemoryStore {
  if (!storeInstance) {
    storeInstance = new MemoryStore();
  }
  return storeInstance;
}

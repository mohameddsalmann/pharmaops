import type {
  BotRun,
  BotRunEvent,
  EvaluatorResult,
  FieldComparison,
  QaReviewAction,
  BotOpsAuditLog,
  BotRunSummary,
  RegressionBaseline,
  BotRunDetail,
  BotRunFilters,
  RunArtifact,
} from "@/lib/schemas/bot-run";
import { generateId, nowISO } from "@/lib/utils/id";
import { sampleBotRuns, regressionBaselines } from "@/lib/mock/sample-bot-runs";
import { BOT_RUN_SCHEMA_VERSION, EVENT_SCHEMA_VERSION } from "@/lib/botops/versions";

export interface BotOpsStore {
  listRuns(filters?: BotRunFilters): Promise<BotRun[]>;
  getRun(runId: string): Promise<BotRun | null>;
  getRunDetail(runId: string): Promise<BotRunDetail | null>;
  createRun(data: {
    run: BotRun;
    events: BotRunEvent[];
  }): Promise<BotRun>;
  updateRun(run: BotRun): Promise<BotRun>;
  deleteRun(runId: string): Promise<void>;
  getEvents(runId: string): Promise<BotRunEvent[]>;
  appendEvent(runId: string, event: BotRunEvent): Promise<void>;
  getRunEventsCount(runId: string): Promise<number>;
  getEvaluatorResults(runId: string): Promise<EvaluatorResult[]>;
  setEvaluatorResults(runId: string, results: EvaluatorResult[]): Promise<void>;
  getFieldComparisons(runId: string): Promise<FieldComparison[]>;
  setFieldComparisons(runId: string, comparisons: FieldComparison[]): Promise<void>;
  getQaReviewActions(runId: string): Promise<QaReviewAction[]>;
  addQaReviewAction(action: Omit<QaReviewAction, "id" | "createdAt">): Promise<QaReviewAction>;
  getAuditLogs(runId?: string): Promise<BotOpsAuditLog[]>;
  addAuditLog(log: Omit<BotOpsAuditLog, "id" | "createdAt">): Promise<BotOpsAuditLog>;
  getSummary(runId: string): Promise<BotRunSummary | null>;
  setSummary(summary: BotRunSummary): Promise<void>;
  getBaselines(): Promise<RegressionBaseline[]>;
  getBaseline(workflowType: string, botVersion: string): Promise<RegressionBaseline | null>;
  getArtifacts(runId: string): Promise<RunArtifact[]>;
  addArtifact(artifact: RunArtifact): Promise<void>;
  getArtifact(artifactId: string): Promise<RunArtifact | null>;
  seed(): Promise<void>;
  reset(): Promise<void>;
}

export class BotOpsMemoryStore implements BotOpsStore {
  private runs = new Map<string, BotRun>();
  private events = new Map<string, BotRunEvent[]>();
  private evaluatorResults = new Map<string, EvaluatorResult[]>();
  private fieldComparisons = new Map<string, FieldComparison[]>();
  private qaReviewActions = new Map<string, QaReviewAction[]>();
  private auditLogs: BotOpsAuditLog[] = [];
  private summaries = new Map<string, BotRunSummary>();
  private baselines: RegressionBaseline[] = [];
  private artifacts = new Map<string, RunArtifact[]>();

  async listRuns(filters?: BotRunFilters): Promise<BotRun[]> {
    let runs = Array.from(this.runs.values());
    if (filters) {
      if (filters.status) runs = runs.filter((r) => r.status === filters.status);
      if (filters.riskLevel) runs = runs.filter((r) => r.riskLevel === filters.riskLevel);
      if (filters.decision) runs = runs.filter((r) => r.decision === filters.decision);
      if (filters.workflowType) runs = runs.filter((r) => r.workflowType === filters.workflowType);
      if (filters.pmsType) runs = runs.filter((r) => r.pmsType === filters.pmsType);
      if (filters.botVersion) runs = runs.filter((r) => r.botVersion === filters.botVersion);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        runs = runs.filter(
          (r) =>
            r.runNumber.toLowerCase().includes(q) ||
            r.pharmacyName.toLowerCase().includes(q) ||
            r.finalOutcome.toLowerCase().includes(q)
        );
      }
      if (filters.needsReview) {
        runs = runs.filter(
          (r) =>
            r.decision === "needs_qa_review" ||
            r.decision === "regression_detected" ||
            r.decision === "ui_drift_detected"
        );
      }
    }
    return runs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  async getRun(runId: string): Promise<BotRun | null> {
    return this.runs.get(runId) ?? null;
  }

  async getRunDetail(runId: string): Promise<BotRunDetail | null> {
    const run = this.runs.get(runId);
    if (!run) return null;
    return {
      ...run,
      events: this.events.get(runId) ?? [],
      evaluatorResults: this.evaluatorResults.get(runId) ?? [],
      fieldComparisons: this.fieldComparisons.get(runId) ?? [],
      qaReviewActions: this.qaReviewActions.get(runId) ?? [],
      auditLogs: this.auditLogs.filter((l) => l.botRunId === runId),
      summary: this.summaries.get(runId) ?? null,
      baseline: await this.getBaseline(run.workflowType, run.baselineVersion ?? run.botVersion),
      artifacts: await this.getArtifacts(runId),
    };
  }

  async createRun(data: { run: BotRun; events: BotRunEvent[] }): Promise<BotRun> {
    this.runs.set(data.run.id, data.run);
    this.events.set(data.run.id, data.events);
    return data.run;
  }

  async updateRun(run: BotRun): Promise<BotRun> {
    this.runs.set(run.id, run);
    return run;
  }

  async deleteRun(runId: string): Promise<void> {
    this.runs.delete(runId);
    this.events.delete(runId);
    this.evaluatorResults.delete(runId);
    this.fieldComparisons.delete(runId);
    this.qaReviewActions.delete(runId);
    this.summaries.delete(runId);
    this.artifacts.delete(runId);
  }

  async getEvents(runId: string): Promise<BotRunEvent[]> {
    return this.events.get(runId) ?? [];
  }

  async appendEvent(runId: string, event: BotRunEvent): Promise<void> {
    const list = this.events.get(runId) ?? [];
    list.push(event);
    this.events.set(runId, list);
  }

  async getRunEventsCount(runId: string): Promise<number> {
    return this.events.get(runId)?.length ?? 0;
  }

  async getEvaluatorResults(runId: string): Promise<EvaluatorResult[]> {
    return this.evaluatorResults.get(runId) ?? [];
  }

  async setEvaluatorResults(runId: string, results: EvaluatorResult[]): Promise<void> {
    this.evaluatorResults.set(runId, results);
  }

  async getFieldComparisons(runId: string): Promise<FieldComparison[]> {
    return this.fieldComparisons.get(runId) ?? [];
  }

  async setFieldComparisons(runId: string, comparisons: FieldComparison[]): Promise<void> {
    this.fieldComparisons.set(runId, comparisons);
  }

  async getQaReviewActions(runId: string): Promise<QaReviewAction[]> {
    return this.qaReviewActions.get(runId) ?? [];
  }

  async addQaReviewAction(action: Omit<QaReviewAction, "id" | "createdAt">): Promise<QaReviewAction> {
    const full: QaReviewAction = {
      ...action,
      id: generateId(),
      createdAt: nowISO(),
    };
    const list = this.qaReviewActions.get(action.botRunId) ?? [];
    list.push(full);
    this.qaReviewActions.set(action.botRunId, list);
    return full;
  }

  async getAuditLogs(runId?: string): Promise<BotOpsAuditLog[]> {
    if (runId) return this.auditLogs.filter((l) => l.botRunId === runId);
    return [...this.auditLogs];
  }

  async addAuditLog(log: Omit<BotOpsAuditLog, "id" | "createdAt">): Promise<BotOpsAuditLog> {
    const full: BotOpsAuditLog = {
      ...log,
      id: generateId(),
      createdAt: nowISO(),
    };
    this.auditLogs.push(full);
    return full;
  }

  async getSummary(runId: string): Promise<BotRunSummary | null> {
    return this.summaries.get(runId) ?? null;
  }

  async setSummary(summary: BotRunSummary): Promise<void> {
    this.summaries.set(summary.botRunId, summary);
  }

  async getBaselines(): Promise<RegressionBaseline[]> {
    return [...this.baselines];
  }

  async getBaseline(workflowType: string, botVersion: string): Promise<RegressionBaseline | null> {
    return (
      this.baselines.find(
        (b) => b.workflowType === workflowType && b.botVersion === botVersion
      ) ?? null
    );
  }

  async getArtifacts(runId: string): Promise<RunArtifact[]> {
    return this.artifacts.get(runId) ?? [];
  }

  async addArtifact(artifact: RunArtifact): Promise<void> {
    const list = this.artifacts.get(artifact.runId) ?? [];
    list.push(artifact);
    this.artifacts.set(artifact.runId, list);
  }

  async getArtifact(artifactId: string): Promise<RunArtifact | null> {
    for (const list of this.artifacts.values()) {
      const art = list.find((a) => a.id === artifactId);
      if (art) return art;
    }
    return null;
  }

  async seed(): Promise<void> {
    this.baselines = [...regressionBaselines];
    for (const sample of sampleBotRuns) {
      const runId = sample.run.id;
      const run: BotRun = {
        ...sample.run,
        containsPhi: false,
        phiRedacted: true,
        safeForReview: true,
        redactionFindings: [],
        overallScore: null,
        riskLevel: null,
        decision: null,
        mainFinding: null,
        recommendedAction: null,
        releaseReadinessScore: null,
        mainRisk: null,
        recommendedEngineeringAction: null,
        recommendedQaAction: null,
        scenarioId: null,
        expectedFields: sample.expectedFields,
        botRunSchemaVersion: BOT_RUN_SCHEMA_VERSION,
        workflowSpecVersion: "1.0.0",
        workflowSpecId: null,
        workflowSpecHash: null,
      };
      this.runs.set(runId, run);
      this.events.set(
        runId,
        sample.events.map((e) => ({
          ...e,
          id: generateId(),
          botRunId: runId,
          eventSchemaVersion: EVENT_SCHEMA_VERSION,
        }))
      );
    }
  }

  async reset(): Promise<void> {
    this.runs.clear();
    this.events.clear();
    this.evaluatorResults.clear();
    this.fieldComparisons.clear();
    this.qaReviewActions.clear();
    this.auditLogs = [];
    this.summaries.clear();
    this.baselines = [];
    this.artifacts.clear();
  }
}

export function getBotOpsMemoryStore(): BotOpsMemoryStore {
  const g = globalThis as unknown as { _botOpsMemoryStore?: BotOpsMemoryStore };
  if (!g._botOpsMemoryStore) {
    g._botOpsMemoryStore = new BotOpsMemoryStore();
  }
  return g._botOpsMemoryStore;
}

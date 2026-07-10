import { createClient } from "@supabase/supabase-js";
import { getBotOpsConfig, isSupabaseConfigured } from "@/lib/botops/config";
import { getBotOpsMemoryStore } from "@/lib/db/botops-store";
import type { BotOpsStore } from "@/lib/db/botops-store";
import type {
  BotRun,
  BotRunEvent,
  EvaluatorResult,
  FieldComparison,
  QaReviewAction,
  BotOpsAuditLog,
  BotRunSummary,
  RegressionBaseline,
  RunArtifact,
} from "@/lib/schemas/bot-run";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function handleSupabaseError<T>(err: unknown, fallback: () => T): T {
  if (isProduction()) {
    throw err;
  }
  return fallback();
}

export function getBotOpsSupabaseStore(): BotOpsStore | null {
  const cfg = getBotOpsConfig();
  if (!isSupabaseConfigured(cfg)) return null;

  try {
    const url = cfg.supabaseUrl!;
    const key = cfg.supabaseServiceRoleKey ?? cfg.supabaseAnonKey!;
    const client = createClient(url, key);
    const memory = getBotOpsMemoryStore();

    return {
      async listRuns(filters) {
        try {
          let query = client.from("botops_runs").select("*").order("started_at", { ascending: false });
          if (filters?.status) query = query.eq("execution_status", filters.status);
          if (filters?.workflowType) query = query.eq("workflow_type", filters.workflowType);
          if (filters?.pmsType) query = query.eq("pms_type", filters.pmsType);
          if (filters?.botVersion) query = query.eq("bot_version", filters.botVersion);
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map(rowToRun);
        } catch (err) {
          return handleSupabaseError(err, () => memory.listRuns(filters));
        }
      },
      async getRun(runId) {
        try {
          const { data, error } = await client.from("botops_runs").select("*").eq("id", runId).maybeSingle();
          if (error) throw error;
          return data ? rowToRun(data) : null;
        } catch (err) {
          return handleSupabaseError(err, () => memory.getRun(runId));
        }
      },
      async getRunDetail(runId) {
        try {
          const run = await this.getRun(runId);
          if (!run) return null;
          const [events, evaluatorResults, fieldComparisons, qaActions, auditLogs, summary, artifacts] = await Promise.all([
            this.getEvents(runId),
            this.getEvaluatorResults(runId),
            this.getFieldComparisons(runId),
            this.getQaReviewActions(runId),
            this.getAuditLogs(runId),
            this.getSummary(runId),
            this.getArtifacts(runId),
          ]);
          const baseline = await this.getBaseline(run.workflowType, run.baselineVersion ?? run.botVersion);
          return { ...run, events, evaluatorResults, fieldComparisons, qaReviewActions: qaActions, auditLogs, summary, baseline, artifacts };
        } catch (err) {
          return handleSupabaseError(err, () => memory.getRunDetail(runId));
        }
      },
      async createRun(data) {
        try {
          const { error } = await client.from("botops_runs").insert(runToRow(data.run));
          if (error) throw error;
          if (data.events.length > 0) {
            const { error: eErr } = await client.from("botops_events").insert(data.events.map(eventToRow));
            if (eErr) throw eErr;
          }
          return data.run;
        } catch (err) {
          return handleSupabaseError(err, () => memory.createRun(data));
        }
      },
      async updateRun(run) {
        try {
          const { error } = await client.from("botops_runs").update(runToRow(run)).eq("id", run.id);
          if (error) throw error;
          return run;
        } catch (err) {
          return handleSupabaseError(err, () => memory.updateRun(run));
        }
      },
      async claimCompletion(runId, completionClientId, finalOutcome, updates) {
        try {
          const { data, error } = await client
            .from("botops_runs")
            .update({
              execution_status: "completed",
              completed_at: new Date().toISOString(),
              final_outcome: finalOutcome,
              evaluation_status: "running",
              completion_client_id: completionClientId ?? null,
              status: "completed",
              processed_item_count: updates.processedItemCount ?? null,
              external_task_status: updates.externalTaskStatus ?? null,
            })
            .eq("id", runId)
            .eq("execution_status", "running")
            .select();
          if (error) throw error;
          if (!data || data.length === 0) return null;
          return rowToRun(data[0]);
        } catch (err) {
          return handleSupabaseError(err, () => memory.claimCompletion(runId, completionClientId, finalOutcome, updates));
        }
      },
      async deleteRun(runId) {
        try {
          await client.from("botops_runs").delete().eq("id", runId);
        } catch (err) {
          handleSupabaseError(err, () => { memory.deleteRun(runId); });
        }
      },
      async getEvents(runId) {
        try {
          const { data, error } = await client.from("botops_events").select("*").eq("bot_run_id", runId).order("step_number");
          if (error) throw error;
          return (data ?? []).map(rowToEvent);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getEvents(runId));
        }
      },
      async appendEvent(runId, event) {
        try {
          const { error } = await client.from("botops_events").insert(eventToRow(event));
          if (error) throw error;
        } catch (err) {
          handleSupabaseError(err, () => { memory.appendEvent(runId, event); });
        }
      },
      async getRunEventsCount(runId) {
        try {
          const { count, error } = await client.from("botops_events").select("*", { count: "exact", head: true }).eq("bot_run_id", runId);
          if (error) throw error;
          return count ?? 0;
        } catch (err) {
          return handleSupabaseError(err, () => memory.getRunEventsCount(runId));
        }
      },
      async getEvaluatorResults(runId) {
        try {
          const { data, error } = await client.from("botops_evaluator_results").select("*").eq("bot_run_id", runId);
          if (error) throw error;
          return (data ?? []).map(rowToEvaluatorResult);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getEvaluatorResults(runId));
        }
      },
      async setEvaluatorResults(runId, results) {
        try {
          await client.from("botops_evaluator_results").delete().eq("bot_run_id", runId);
          if (results.length > 0) {
            const { error } = await client.from("botops_evaluator_results").insert(results.map(evaluatorResultToRow));
            if (error) throw error;
          }
        } catch (err) {
          handleSupabaseError(err, () => { memory.setEvaluatorResults(runId, results); });
        }
      },
      async getFieldComparisons(runId) {
        try {
          const { data, error } = await client.from("botops_field_comparisons").select("*").eq("bot_run_id", runId);
          if (error) throw error;
          return (data ?? []).map(rowToFieldComparison);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getFieldComparisons(runId));
        }
      },
      async setFieldComparisons(runId, comparisons) {
        try {
          await client.from("botops_field_comparisons").delete().eq("bot_run_id", runId);
          if (comparisons.length > 0) {
            const { error } = await client.from("botops_field_comparisons").insert(comparisons.map(fieldComparisonToRow));
            if (error) throw error;
          }
        } catch (err) {
          handleSupabaseError(err, () => { memory.setFieldComparisons(runId, comparisons); });
        }
      },
      async getQaReviewActions(runId) {
        try {
          const { data, error } = await client.from("botops_qa_review_actions").select("*").eq("bot_run_id", runId).order("created_at");
          if (error) throw error;
          return (data ?? []).map(rowToQaReviewAction);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getQaReviewActions(runId));
        }
      },
      async addQaReviewAction(action) {
        try {
          const row = qaReviewActionToRow({ ...action, id: "", createdAt: "" });
          const { data, error } = await client.from("botops_qa_review_actions").insert(row).select().single();
          if (error) throw error;
          return rowToQaReviewAction(data);
        } catch (err) {
          return handleSupabaseError(err, () => memory.addQaReviewAction(action));
        }
      },
      async getAuditLogs(runId) {
        try {
          let query = client.from("botops_audit_logs").select("*").order("created_at", { ascending: false });
          if (runId) query = query.eq("bot_run_id", runId);
          const { data, error } = await query;
          if (error) throw error;
          return (data ?? []).map(rowToAuditLog);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getAuditLogs(runId));
        }
      },
      async addAuditLog(log) {
        try {
          const row = auditLogToRow({ ...log, id: "", createdAt: "" });
          const { data, error } = await client.from("botops_audit_logs").insert(row).select().single();
          if (error) throw error;
          return rowToAuditLog(data);
        } catch (err) {
          return handleSupabaseError(err, () => memory.addAuditLog(log));
        }
      },
      async getSummary(runId) {
        try {
          const { data, error } = await client.from("botops_summaries").select("*").eq("bot_run_id", runId).maybeSingle();
          if (error) throw error;
          return data ? rowToSummary(data) : null;
        } catch (err) {
          return handleSupabaseError(err, () => memory.getSummary(runId));
        }
      },
      async setSummary(summary) {
        try {
          const { error } = await client.from("botops_summaries").upsert(summaryToRow(summary));
          if (error) throw error;
        } catch (err) {
          handleSupabaseError(err, () => { memory.setSummary(summary); });
        }
      },
      async getBaselines() {
        try {
          const { data, error } = await client.from("botops_regression_baselines").select("*");
          if (error) throw error;
          return (data ?? []).map(rowToBaseline);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getBaselines());
        }
      },
      async getBaseline(workflowType, botVersion) {
        try {
          const { data, error } = await client
            .from("botops_regression_baselines")
            .select("*")
            .eq("workflow_type", workflowType)
            .eq("bot_version", botVersion)
            .maybeSingle();
          if (error) throw error;
          return data ? rowToBaseline(data) : null;
        } catch (err) {
          return handleSupabaseError(err, () => memory.getBaseline(workflowType, botVersion));
        }
      },
      async getArtifacts(runId) {
        try {
          const { data, error } = await client.from("botops_artifacts").select("*").eq("run_id", runId).order("created_at");
          if (error) throw error;
          return (data ?? []).map(rowToArtifact);
        } catch (err) {
          return handleSupabaseError(err, () => memory.getArtifacts(runId));
        }
      },
      async addArtifact(artifact) {
        try {
          const { error } = await client.from("botops_artifacts").insert(artifactToRow(artifact));
          if (error) throw error;
        } catch (err) {
          handleSupabaseError(err, () => { memory.addArtifact(artifact); });
        }
      },
      async getArtifact(artifactId) {
        try {
          const { data, error } = await client.from("botops_artifacts").select("*").eq("id", artifactId).maybeSingle();
          if (error) throw error;
          return data ? rowToArtifact(data) : null;
        } catch (err) {
          return handleSupabaseError(err, () => memory.getArtifact(artifactId));
        }
      },
      async seed() {
        if (isProduction()) return;
        await memory.seed();
      },
      async reset() {
        if (isProduction()) return;
        await memory.reset();
      },
    };
  } catch {
    return null;
  }
}

// ── snake_case ↔ camelCase conversion utilities ──

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function convertRow<T>(row: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[snakeToCamel(key)] = value;
  }
  return result as T;
}

function convertObj(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[camelToSnake(key)] = value;
    }
  }
  return result;
}

// ── Run mappers ──

function rowToRun(row: Record<string, unknown>): BotRun {
  return convertRow<BotRun>(row);
}

function runToRow(run: BotRun): Record<string, unknown> {
  return convertObj(run as unknown as Record<string, unknown>);
}

// ── Event mappers ──

function rowToEvent(row: Record<string, unknown>): BotRunEvent {
  return convertRow<BotRunEvent>(row);
}

function eventToRow(event: BotRunEvent): Record<string, unknown> {
  return convertObj(event as unknown as Record<string, unknown>);
}

// ── Evaluator result mappers ──

function rowToEvaluatorResult(row: Record<string, unknown>): EvaluatorResult {
  return convertRow<EvaluatorResult>(row);
}

function evaluatorResultToRow(r: EvaluatorResult): Record<string, unknown> {
  return convertObj(r as unknown as Record<string, unknown>);
}

// ── Field comparison mappers ──

function rowToFieldComparison(row: Record<string, unknown>): FieldComparison {
  return convertRow<FieldComparison>(row);
}

function fieldComparisonToRow(fc: FieldComparison): Record<string, unknown> {
  return convertObj(fc as unknown as Record<string, unknown>);
}

// ── QA review action mappers ──

function rowToQaReviewAction(row: Record<string, unknown>): QaReviewAction {
  return convertRow<QaReviewAction>(row);
}

function qaReviewActionToRow(a: QaReviewAction): Record<string, unknown> {
  return convertObj(a as unknown as Record<string, unknown>);
}

// ── Audit log mappers ──

function rowToAuditLog(row: Record<string, unknown>): BotOpsAuditLog {
  return convertRow<BotOpsAuditLog>(row);
}

function auditLogToRow(l: BotOpsAuditLog): Record<string, unknown> {
  return convertObj(l as unknown as Record<string, unknown>);
}

// ── Summary mappers ──

function rowToSummary(row: Record<string, unknown>): BotRunSummary {
  return convertRow<BotRunSummary>(row);
}

function summaryToRow(s: BotRunSummary): Record<string, unknown> {
  return convertObj(s as unknown as Record<string, unknown>);
}

// ── Baseline mappers ──

function rowToBaseline(row: Record<string, unknown>): RegressionBaseline {
  return convertRow<RegressionBaseline>(row);
}

// ── Artifact mappers ──

function rowToArtifact(row: Record<string, unknown>): RunArtifact {
  return convertRow<RunArtifact>(row);
}

function artifactToRow(a: RunArtifact): Record<string, unknown> {
  return convertObj(a as unknown as Record<string, unknown>);
}

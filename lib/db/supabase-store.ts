import type { DemoStore } from "./types";

export class SupabaseStore implements DemoStore {
  private supabaseUrl: string;
  private serviceRoleKey: string;

  constructor(url: string, key: string) {
    this.supabaseUrl = url;
    this.serviceRoleKey = key;
  }

  private async getClient() {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(this.supabaseUrl, this.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async createCase(input: {
    sourceType: string;
    prescriptionText: string;
    patientProfile: Record<string, unknown>;
    insuranceProfile: Record<string, unknown>;
  }): Promise<import("@/lib/schemas/case").Case> {
    const sb = await this.getClient();
    const { data, error } = await sb
      .from("cases")
      .insert({
        case_number: `PG-${Date.now().toString(36).toUpperCase()}`,
        source_type: input.sourceType,
        status: "pending_qa",
        risk_level: null,
        risk_score: null,
        final_decision: null,
        created_by: "demo-user",
      })
      .select()
      .single();
    if (error || !data) throw new Error(`Supabase createCase failed: ${error?.message}`);

    await sb.from("prescription_inputs").insert({
      case_id: data.id,
      prescription_text: input.prescriptionText,
      patient_profile: input.patientProfile,
      insurance_profile: input.insuranceProfile,
    });

    return {
      id: data.id,
      caseNumber: data.case_number,
      sourceType: data.source_type,
      status: data.status,
      riskLevel: data.risk_level,
      riskScore: data.risk_score,
      finalDecision: data.final_decision,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      assignedReviewer: data.assigned_reviewer,
      qaRunInProgress: false,
    };
  }

  async getCase(caseId: string): Promise<import("@/lib/schemas/case").Case | null> {
    const sb = await this.getClient();
    const { data, error } = await sb.from("cases").select("*").eq("id", caseId).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      caseNumber: data.case_number,
      sourceType: data.source_type,
      status: data.status,
      riskLevel: data.risk_level,
      riskScore: data.risk_score,
      finalDecision: data.final_decision,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      assignedReviewer: data.assigned_reviewer,
      qaRunInProgress: false,
    };
  }

  async getCaseDetail(caseId: string): Promise<import("./types").CaseDetail | null> {
    const c = await this.getCase(caseId);
    if (!c) return null;
    const sb = await this.getClient();
    const [rx, runs, exc, ev, logs, reviews, drafts] = await Promise.all([
      sb.from("prescription_inputs").select("*").eq("case_id", caseId).maybeSingle(),
      sb.from("agent_runs").select("*").eq("case_id", caseId).order("started_at"),
      sb.from("exceptions").select("*").eq("case_id", caseId),
      sb.from("evidence_items").select("*").eq("case_id", caseId),
      sb.from("audit_logs").select("*").eq("case_id", caseId).order("created_at"),
      sb.from("review_actions").select("*").eq("case_id", caseId).order("created_at"),
      sb.from("patient_message_drafts").select("*").eq("case_id", caseId).order("created_at"),
    ]);

    return {
      ...c,
      prescriptionInput: rx.data
        ? {
            id: rx.data.id,
            caseId,
            prescriptionText: rx.data.prescription_text,
            patientProfile: rx.data.patient_profile,
            insuranceProfile: rx.data.insurance_profile,
            createdAt: rx.data.created_at,
          }
        : null,
      agentRuns: (runs.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        caseId,
        agentName: r.agent_name as string,
        status: r.status as "running" | "completed" | "failed",
        input: r.input as Record<string, unknown>,
        output: r.output as Record<string, unknown> | null,
        confidence: r.confidence as number | null,
        startedAt: r.started_at as string,
        completedAt: r.completed_at as string | null,
        error: r.error as string | null,
        usedFallback: r.used_fallback as boolean,
        provider: r.provider as string | null,
        model: r.model as string | null,
        latencyMs: r.latency_ms as number | null,
      })),
      exceptions: (exc.data ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        type: e.type as "missing_required_field" | "low_confidence" | "identity_mismatch" | "insurance_conflict" | "safety_review_required" | "communication_approval_required" | "none",
        severity: e.severity as "low" | "medium" | "high" | "critical",
        reason: e.reason as string,
        recommendedAction: e.recommended_action as string,
        confidence: e.confidence as number,
        evidenceSource: e.evidence_source as string | undefined,
      })),
      evidence: (ev.data ?? []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        caseId,
        sourceTitle: e.source_title as string,
        sourceType: e.source_type as string,
        snippet: e.snippet as string,
        relevanceScore: e.relevance_score as number,
        usedByAgent: e.used_by_agent as string,
        createdAt: e.created_at as string,
      })),
      auditLogs: (logs.data ?? []).map((l: Record<string, unknown>) => ({
        id: l.id as string,
        caseId,
        actorType: l.actor_type as "agent" | "human" | "system",
        actorName: l.actor_name as string,
        action: l.action as string,
        details: l.details as Record<string, unknown>,
        confidence: l.confidence as number | null,
        createdAt: l.created_at as string,
      })),
      reviewActions: (reviews.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        caseId,
        reviewerName: r.reviewer_name as string,
        action: r.action as "approve" | "reject" | "request_info" | "send_to_prior_auth" | "assign_to_pharmacist",
        note: r.note as string,
        createdAt: r.created_at as string,
      })),
      messageDrafts: (drafts.data ?? []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        caseId,
        messageType: d.message_type as "missing_information" | "prior_authorization" | "review_pending" | "refill_status" | "general_update",
        channel: d.channel as "sms" | "call_script" | "email",
        body: d.body as string,
        requiresHumanApproval: d.requires_human_approval as boolean,
        safetyNotes: d.safety_notes as string[],
      })),
    };
  }

  async listCases(filters?: import("./types").CaseFilters): Promise<import("@/lib/schemas/case").Case[]> {
    const sb = await this.getClient();
    let query = sb.from("cases").select("*");
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.riskLevel) query = query.eq("risk_level", filters.riskLevel);
    if (filters?.decision) query = query.eq("final_decision", filters.decision);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      caseNumber: d.case_number as string,
      sourceType: d.source_type as "fax" | "erx" | "provider_portal" | "manual",
      status: d.status as "pending_qa" | "approved" | "needs_human_review" | "missing_information" | "prior_authorization_required" | "rejected" | "cannot_determine" | "in_review",
      riskLevel: d.risk_level as "low" | "medium" | "high" | "critical" | null,
      riskScore: d.risk_score as number | null,
      finalDecision: d.final_decision as string | null,
      createdAt: d.created_at as string,
      updatedAt: d.updated_at as string,
      createdBy: d.created_by as string,
      assignedReviewer: d.assigned_reviewer as string | null,
      qaRunInProgress: false,
    }));
  }

  async updateCase(
    caseId: string,
    updates: Partial<Pick<import("@/lib/schemas/case").Case, "status" | "riskLevel" | "riskScore" | "finalDecision" | "assignedReviewer" | "qaRunInProgress" | "updatedAt">>
  ): Promise<import("@/lib/schemas/case").Case | null> {
    const sb = await this.getClient();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status) update.status = updates.status;
    if (updates.riskLevel) update.risk_level = updates.riskLevel;
    if (updates.riskScore !== undefined) update.risk_score = updates.riskScore;
    if (updates.finalDecision !== undefined) update.final_decision = updates.finalDecision;
    if (updates.assignedReviewer !== undefined) update.assigned_reviewer = updates.assignedReviewer;
    const { data, error } = await sb.from("cases").update(update).eq("id", caseId).select("*").single();
    if (error || !data) return null;
    return {
      id: data.id,
      caseNumber: data.case_number,
      sourceType: data.source_type,
      status: data.status,
      riskLevel: data.risk_level,
      riskScore: data.risk_score,
      finalDecision: data.final_decision,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
      assignedReviewer: data.assigned_reviewer,
      qaRunInProgress: false,
    };
  }

  async saveAgentRun(run: Omit<import("@/lib/schemas/agents").AgentRun, "id">): Promise<import("@/lib/schemas/agents").AgentRun> {
    const sb = await this.getClient();
    const { data, error } = await sb
      .from("agent_runs")
      .insert({
        case_id: run.caseId,
        agent_name: run.agentName,
        status: run.status,
        input: run.input,
        output: run.output,
        confidence: run.confidence,
        started_at: run.startedAt,
        completed_at: run.completedAt,
        error: run.error,
        used_fallback: run.usedFallback,
        provider: run.provider,
        model: run.model,
        latency_ms: run.latencyMs,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`Supabase saveAgentRun failed: ${error?.message}`);
    return { ...run, id: data.id };
  }

  async updateAgentRun(id: string, updates: Partial<import("@/lib/schemas/agents").AgentRun>): Promise<import("@/lib/schemas/agents").AgentRun | null> {
    const sb = await this.getClient();
    const update: Record<string, unknown> = {};
    if (updates.status) update.status = updates.status;
    if (updates.output !== undefined) update.output = updates.output;
    if (updates.confidence !== undefined) update.confidence = updates.confidence;
    if (updates.completedAt !== undefined) update.completed_at = updates.completedAt;
    if (updates.error !== undefined) update.error = updates.error;
    if (updates.usedFallback !== undefined) update.used_fallback = updates.usedFallback;
    if (updates.latencyMs !== undefined) update.latency_ms = updates.latencyMs;
    const { data, error } = await sb.from("agent_runs").update(update).eq("id", id).select("*").single();
    if (error || !data) return null;
    return { ...updates, id, caseId: data.case_id, agentName: data.agent_name } as import("@/lib/schemas/agents").AgentRun;
  }

  async listAgentRuns(caseId: string): Promise<import("@/lib/schemas/agents").AgentRun[]> {
    const sb = await this.getClient();
    const { data } = await sb.from("agent_runs").select("*").eq("case_id", caseId).order("started_at");
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      caseId,
      agentName: r.agent_name as string,
      status: r.status as "running" | "completed" | "failed",
      input: r.input as Record<string, unknown>,
      output: r.output as Record<string, unknown> | null,
      confidence: r.confidence as number | null,
      startedAt: r.started_at as string,
      completedAt: r.completed_at as string | null,
      error: r.error as string | null,
      usedFallback: r.used_fallback as boolean,
      provider: r.provider as string | null,
      model: r.model as string | null,
      latencyMs: r.latency_ms as number | null,
    }));
  }

  async saveExceptions(caseId: string, exceptions: import("@/lib/schemas/agents").ExceptionItem[]): Promise<void> {
    const sb = await this.getClient();
    await sb.from("exceptions").delete().eq("case_id", caseId);
    if (exceptions.length === 0) return;
    await sb.from("exceptions").insert(
      exceptions.map((e) => ({
        id: e.id,
        case_id: caseId,
        type: e.type,
        severity: e.severity,
        reason: e.reason,
        recommended_action: e.recommendedAction,
        confidence: e.confidence,
        evidence_source: e.evidenceSource ?? null,
      }))
    );
  }

  async listExceptions(caseId: string): Promise<import("@/lib/schemas/agents").ExceptionItem[]> {
    const sb = await this.getClient();
    const { data } = await sb.from("exceptions").select("*").eq("case_id", caseId);
    if (!data) return [];
    return data.map((e: Record<string, unknown>) => ({
      id: e.id as string,
      type: e.type as "missing_required_field" | "low_confidence" | "identity_mismatch" | "insurance_conflict" | "safety_review_required" | "communication_approval_required" | "none",
      severity: e.severity as "low" | "medium" | "high" | "critical",
      reason: e.reason as string,
      recommendedAction: e.recommended_action as string,
      confidence: e.confidence as number,
      evidenceSource: e.evidence_source as string | undefined,
    }));
  }

  async saveEvidence(items: Omit<import("@/lib/schemas/agents").EvidenceItem, "id" | "createdAt">[]): Promise<void> {
    const sb = await this.getClient();
    if (items.length === 0) return;
    await sb.from("evidence_items").insert(
      items.map((i) => ({
        case_id: i.caseId,
        source_title: i.sourceTitle,
        source_type: i.sourceType,
        snippet: i.snippet,
        relevance_score: i.relevanceScore,
        used_by_agent: i.usedByAgent,
      }))
    );
  }

  async listEvidence(caseId: string): Promise<import("@/lib/schemas/agents").EvidenceItem[]> {
    const sb = await this.getClient();
    const { data } = await sb.from("evidence_items").select("*").eq("case_id", caseId);
    if (!data) return [];
    return data.map((e: Record<string, unknown>) => ({
      id: e.id as string,
      caseId,
      sourceTitle: e.source_title as string,
      sourceType: e.source_type as string,
      snippet: e.snippet as string,
      relevanceScore: e.relevance_score as number,
      usedByAgent: e.used_by_agent as string,
      createdAt: e.created_at as string,
    }));
  }

  async appendAuditLog(log: Omit<import("@/lib/schemas/audit").AuditLog, "id" | "createdAt">): Promise<import("@/lib/schemas/audit").AuditLog> {
    const sb = await this.getClient();
    const { data, error } = await sb
      .from("audit_logs")
      .insert({
        case_id: log.caseId,
        actor_type: log.actorType,
        actor_name: log.actorName,
        action: log.action,
        details: log.details,
        confidence: log.confidence,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`Supabase appendAuditLog failed: ${error?.message}`);
    return { ...log, id: data.id, createdAt: data.created_at };
  }

  async listAuditLogs(filters?: import("./types").AuditFilters): Promise<import("@/lib/schemas/audit").AuditLog[]> {
    const sb = await this.getClient();
    let query = sb.from("audit_logs").select("*");
    if (filters?.caseId) query = query.eq("case_id", filters.caseId);
    if (filters?.actorType) query = query.eq("actor_type", filters.actorType);
    if (filters?.action) query = query.eq("action", filters.action);
    const { data } = await query.order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((l: Record<string, unknown>) => ({
      id: l.id as string,
      caseId: l.case_id as string,
      actorType: l.actor_type as "agent" | "human" | "system",
      actorName: l.actor_name as string,
      action: l.action as string,
      details: l.details as Record<string, unknown>,
      confidence: l.confidence as number | null,
      createdAt: l.created_at as string,
    }));
  }

  async saveReviewAction(action: Omit<import("@/lib/schemas/review").ReviewAction, "id" | "createdAt">): Promise<import("@/lib/schemas/review").ReviewAction> {
    const sb = await this.getClient();
    const { data, error } = await sb
      .from("review_actions")
      .insert({
        case_id: action.caseId,
        reviewer_name: action.reviewerName,
        action: action.action,
        note: action.note,
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`Supabase saveReviewAction failed: ${error?.message}`);
    return { ...action, id: data.id, createdAt: data.created_at };
  }

  async listReviewActions(caseId: string): Promise<import("@/lib/schemas/review").ReviewAction[]> {
    const sb = await this.getClient();
    const { data } = await sb.from("review_actions").select("*").eq("case_id", caseId).order("created_at", { ascending: false });
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      caseId,
      reviewerName: r.reviewer_name as string,
      action: r.action as "approve" | "reject" | "request_info" | "send_to_prior_auth" | "assign_to_pharmacist",
      note: r.note as string,
      createdAt: r.created_at as string,
    }));
  }

  async saveMessageDraft(draft: Omit<import("@/lib/schemas/agents").PatientMessageDraft, "id"> & { id?: string }): Promise<import("@/lib/schemas/agents").PatientMessageDraft> {
    const sb = await this.getClient();
    const { data, error } = await sb
      .from("patient_message_drafts")
      .insert({
        case_id: draft.caseId,
        message_type: draft.messageType,
        channel: draft.channel,
        body: draft.body,
        requires_human_approval: true,
        status: "draft",
      })
      .select("*")
      .single();
    if (error || !data) throw new Error(`Supabase saveMessageDraft failed: ${error?.message}`);
    return {
      id: data.id,
      caseId: draft.caseId,
      messageType: draft.messageType,
      channel: draft.channel,
      body: draft.body,
      requiresHumanApproval: true,
      safetyNotes: draft.safetyNotes,
    };
  }

  async listMessageDrafts(caseId: string): Promise<import("@/lib/schemas/agents").PatientMessageDraft[]> {
    const sb = await this.getClient();
    const { data } = await sb.from("patient_message_drafts").select("*").eq("case_id", caseId).order("created_at");
    if (!data) return [];
    return data.map((d: Record<string, unknown>) => ({
      id: d.id as string,
      caseId,
      messageType: d.message_type as "missing_information" | "prior_authorization" | "review_pending" | "refill_status" | "general_update",
      channel: d.channel as "sms" | "call_script" | "email",
      body: d.body as string,
      requiresHumanApproval: true,
      safetyNotes: d.safety_notes as string[],
    }));
  }

  async getPrescriptionInput(caseId: string): Promise<import("@/lib/schemas/case").PrescriptionInput | null> {
    const sb = await this.getClient();
    const { data } = await sb.from("prescription_inputs").select("*").eq("case_id", caseId).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      caseId,
      prescriptionText: data.prescription_text,
      patientProfile: data.patient_profile,
      insuranceProfile: data.insurance_profile,
      createdAt: data.created_at,
    };
  }

  async seedDemoData(): Promise<void> {
    const { sampleCases } = await import("@/lib/mock/sample-cases");
    for (const sc of sampleCases) {
      const existing = await this.listCases();
      if (existing.length > 0) break;
      await this.createCase({
        sourceType: sc.sourceType,
        prescriptionText: sc.prescriptionText,
        patientProfile: sc.patientProfile as unknown as Record<string, unknown>,
        insuranceProfile: sc.insuranceProfile as unknown as Record<string, unknown>,
      });
    }
  }

  async resetDemoData(): Promise<void> {
    const sb = await this.getClient();
    await sb.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("review_actions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("patient_message_drafts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("evidence_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("exceptions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("agent_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("prescription_inputs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await sb.from("cases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await this.seedDemoData();
  }
}

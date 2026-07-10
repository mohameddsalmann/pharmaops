-- PharmaGuard — Supabase Schema
-- Run this in the Supabase SQL Editor to create the required tables.

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Cases table
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  source_type text not null default 'manual',
  status text not null default 'pending_qa',
  risk_level text,
  risk_score numeric,
  final_decision text,
  created_by text not null default 'demo-user',
  assigned_reviewer text,
  qa_run_in_progress boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prescription inputs table
create table if not exists prescription_inputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  prescription_text text not null,
  patient_profile jsonb not null default '{}',
  insurance_profile jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Agent runs table
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  agent_name text not null,
  status text not null default 'running',
  input jsonb not null default '{}',
  output jsonb,
  confidence numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  used_fallback boolean not null default false,
  provider text,
  model text,
  latency_ms integer
);

-- Exceptions table
create table if not exists exceptions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  type text not null,
  severity text not null,
  reason text not null,
  recommended_action text not null,
  confidence numeric not null default 0.0,
  evidence_source text
);

-- Evidence items table
create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  source_title text not null,
  source_type text not null,
  snippet text not null,
  relevance_score numeric not null default 0.0,
  used_by_agent text not null,
  created_at timestamptz not null default now()
);

-- Audit logs table
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  actor_type text not null,
  actor_name text not null,
  action text not null,
  details jsonb not null default '{}',
  confidence numeric,
  created_at timestamptz not null default now()
);

-- Review actions table
create table if not exists review_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  reviewer_name text not null,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- Patient message drafts table
create table if not exists patient_message_drafts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  message_type text not null,
  channel text not null,
  body text not null,
  requires_human_approval boolean not null default true,
  safety_notes jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_cases_status on cases(status);
create index if not exists idx_cases_risk_level on cases(risk_level);
create index if not exists idx_cases_created_at on cases(created_at desc);
create index if not exists idx_prescription_inputs_case_id on prescription_inputs(case_id);
create index if not exists idx_agent_runs_case_id on agent_runs(case_id);
create index if not exists idx_exceptions_case_id on exceptions(case_id);
create index if not exists idx_evidence_items_case_id on evidence_items(case_id);
create index if not exists idx_audit_logs_case_id on audit_logs(case_id);
create index if not exists idx_review_actions_case_id on review_actions(case_id);
create index if not exists idx_patient_message_drafts_case_id on patient_message_drafts(case_id);

-- RLS Policies (adjust for production)
-- For demo purposes, we allow all operations. Tighten these for production use.
alter table cases enable row level security;
alter table prescription_inputs enable row level security;
alter table agent_runs enable row level security;
alter table exceptions enable row level security;
alter table evidence_items enable row level security;
alter table audit_logs enable row level security;
alter table review_actions enable row level security;
alter table patient_message_drafts enable row level security;

-- Allow all operations with service role (no anon policies needed for server-side access)
-- Add anon policies if client-side access is required:
-- create policy "Enable all for anon" on cases for all using (true) with check (true);

-- ════════════════════════════════════════════════════════════════
-- BotOps QA Tables (pharmacy automation bot run evaluation)
-- ════════════════════════════════════════════════════════════════

create table if not exists botops_runs (
  id text primary key,
  run_number text not null,
  pharmacy_id text not null,
  pharmacy_name text not null,
  pms_type text not null,
  workflow_type text not null,
  bot_version text not null,
  environment text not null default 'demo',
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null,
  final_outcome text not null default '',
  contains_phi boolean not null default false,
  phi_redacted boolean not null default true,
  safe_for_review boolean not null default true,
  redaction_findings jsonb not null default '[]',
  overall_score numeric,
  risk_level text,
  decision text,
  main_finding text,
  recommended_action text,
  baseline_version text,
  bot_run_schema_version text not null default '1.0.0',
  release_readiness_score numeric,
  main_risk text,
  recommended_engineering_action text,
  recommended_qa_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists botops_events (
  id text primary key,
  bot_run_id text not null references botops_runs(id) on delete cascade,
  step_number integer not null,
  timestamp timestamptz not null,
  screen_name text not null,
  action_type text not null,
  action_summary text not null default '',
  extracted_fields jsonb,
  entered_fields jsonb,
  confidence numeric not null default 0.0,
  duration_ms integer not null default 0,
  screenshot_ref text,
  status text not null default 'success',
  event_schema_version text not null default '1.0.0'
);

create table if not exists botops_evaluator_results (
  id text primary key,
  bot_run_id text not null references botops_runs(id) on delete cascade,
  evaluator_name text not null,
  score numeric not null default 100,
  status text not null default 'passed',
  severity text not null default 'low',
  findings jsonb not null default '[]',
  recommended_action text not null default '',
  evidence_event_ids jsonb not null default '[]',
  deduction_reasons jsonb not null default '[]',
  evaluator_version text not null default '1.0.0'
);

create table if not exists botops_field_comparisons (
  id text primary key,
  bot_run_id text not null references botops_runs(id) on delete cascade,
  field_name text not null,
  expected_value text,
  actual_value text,
  match boolean not null default true,
  severity text not null default 'low'
);

create table if not exists botops_qa_review_actions (
  id text primary key,
  bot_run_id text not null references botops_runs(id) on delete cascade,
  reviewer_name text not null,
  action text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists botops_audit_logs (
  id text primary key,
  bot_run_id text references botops_runs(id) on delete cascade,
  actor_type text not null,
  actor_name text not null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists botops_summaries (
  bot_run_id text primary key references botops_runs(id) on delete cascade,
  summary text not null default '',
  reviewer_note text not null default '',
  engineering_explanation text not null default '',
  used_llm boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists botops_regression_baselines (
  id text primary key,
  workflow_type text not null,
  bot_version text not null,
  pass_rate numeric not null default 0,
  average_latency_ms numeric not null default 0,
  average_score numeric not null default 0,
  failure_count integer not null default 0,
  completion_rate numeric not null default 0,
  known_exception_types jsonb not null default '[]',
  captured_at timestamptz not null default now()
);

-- Add missing columns to botops_runs (idempotent)
alter table botops_runs add column if not exists scenario_id text;
alter table botops_runs add column if not exists workflow_spec_version text default '1.0.0';
alter table botops_runs add column if not exists workflow_spec_id text;
alter table botops_runs add column if not exists workflow_spec_hash text;
alter table botops_runs add column if not exists external_task_id text;
alter table botops_runs add column if not exists automation_label text;
alter table botops_runs add column if not exists runner_id text;
alter table botops_runs add column if not exists external_task_status text;
alter table botops_runs add column if not exists processed_item_count integer;
alter table botops_runs add column if not exists expected_fields jsonb not null default '{}';
alter table botops_runs add column if not exists correlation_id text;

-- Add missing columns to botops_events (idempotent)
alter table botops_events add column if not exists client_event_id text;
alter table botops_events add column if not exists sequence_number integer;
alter table botops_events add column if not exists screen_text text;
alter table botops_events add column if not exists dom_snapshot jsonb;
alter table botops_events add column if not exists ui_fingerprint text;
alter table botops_events add column if not exists before_state_hash text;
alter table botops_events add column if not exists after_state_hash text;
alter table botops_events add column if not exists expected_next_action text;
alter table botops_events add column if not exists actual_next_action text;
alter table botops_events add column if not exists received_at timestamptz;

-- BotOps artifacts table
create table if not exists botops_artifacts (
  id text primary key,
  run_id text not null references botops_runs(id) on delete cascade,
  artifact_type text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null,
  storage_key text not null,
  sha256 text not null,
  redacted boolean not null default true,
  event_id text,
  created_at timestamptz not null default now()
);

-- Idempotency constraints
create unique index if not exists idx_botops_events_run_seq
  on botops_events(bot_run_id, sequence_number);

create unique index if not exists idx_botops_events_run_client_event
  on botops_events(bot_run_id, client_event_id)
  where client_event_id is not null;

-- Additional indexes
create index if not exists idx_botops_runs_external_task_id on botops_runs(external_task_id);
create index if not exists idx_botops_runs_created_at on botops_runs(created_at);
create index if not exists idx_botops_runs_completed_at on botops_runs(completed_at);
create index if not exists idx_botops_runs_correlation_id on botops_runs(correlation_id);
create index if not exists idx_botops_events_client_event_id on botops_events(client_event_id);
create index if not exists idx_botops_events_bot_run_step on botops_events(bot_run_id, step_number);
create index if not exists idx_botops_artifacts_run_id on botops_artifacts(run_id);

-- BotOps RLS for artifacts
alter table botops_artifacts enable row level security;
create policy "botops_artifacts_all" on botops_artifacts for all using (true) with check (true);

-- BotOps indexes
create index if not exists idx_botops_runs_status on botops_runs(status);
create index if not exists idx_botops_runs_risk_level on botops_runs(risk_level);
create index if not exists idx_botops_runs_decision on botops_runs(decision);
create index if not exists idx_botops_runs_workflow_type on botops_runs(workflow_type);
create index if not exists idx_botops_runs_started_at on botops_runs(started_at desc);
create index if not exists idx_botops_events_bot_run_id on botops_events(bot_run_id);
create index if not exists idx_botops_evaluator_results_bot_run_id on botops_evaluator_results(bot_run_id);
create index if not exists idx_botops_field_comparisons_bot_run_id on botops_field_comparisons(bot_run_id);
create index if not exists idx_botops_qa_review_actions_bot_run_id on botops_qa_review_actions(bot_run_id);
create index if not exists idx_botops_audit_logs_bot_run_id on botops_audit_logs(bot_run_id);
create index if not exists idx_botops_regression_baselines_workflow_version on botops_regression_baselines(workflow_type, bot_version);

-- BotOps RLS — permissive for demo
alter table botops_runs enable row level security;
alter table botops_events enable row level security;
alter table botops_evaluator_results enable row level security;
alter table botops_field_comparisons enable row level security;
alter table botops_qa_review_actions enable row level security;
alter table botops_audit_logs enable row level security;
alter table botops_summaries enable row level security;
alter table botops_regression_baselines enable row level security;

create policy "botops_runs_all" on botops_runs for all using (true) with check (true);
create policy "botops_events_all" on botops_events for all using (true) with check (true);
create policy "botops_evaluator_results_all" on botops_evaluator_results for all using (true) with check (true);
create policy "botops_field_comparisons_all" on botops_field_comparisons for all using (true) with check (true);
create policy "botops_qa_review_actions_all" on botops_qa_review_actions for all using (true) with check (true);
create policy "botops_audit_logs_all" on botops_audit_logs for all using (true) with check (true);
create policy "botops_summaries_all" on botops_summaries for all using (true) with check (true);
create policy "botops_regression_baselines_all" on botops_regression_baselines for all using (true) with check (true);

-- ────────────────────────────────────────────────────────────
-- Refresh PostgREST schema cache so new tables/columns are
-- immediately visible (resolves PGRST205 errors).
-- ────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


# PharmaGuard BotOps QA — Pharmacy Automation Bot Certification Platform

PharmaGuard BotOps QA monitors, replays, evaluates, and certifies AI pharmacy automation bot runs across PMS systems. 7 deterministic evaluators, PHI redaction, risk scoring, and release readiness decisions — with full audit trails.

> **Safety Notice:** PHI is redacted before evaluation. LLM summaries are for reviewer notes only and never influence pass/fail or release decisions. All scoring and decisions are deterministic. Uses synthetic data only.

## Features

- **7 Deterministic Evaluators**: Field accuracy, workflow compliance, exception handling, UI drift, loop/stall detection, latency, and regression
- **PHI Redaction Layer**: Automatically redacts DOB, phone, email, SSN, patient/prescriber names before evaluation
- **Risk Scoring & Release Readiness**: Computes overall score (0-100), risk level, QA decision, and release readiness score
- **Bot Run Replay Timeline**: Step-by-step event replay with extracted/entered fields, confidence, and duration
- **Field Comparison Table**: Side-by-side expected vs actual field values with severity ratings
- **QA Review Actions**: Approve, hold, block, flag regression/drift, assign reviewer — with notes
- **Regression Detection**: Compare bot runs against captured baselines by workflow type and bot version
- **UI Drift Detection**: Identify low-confidence screen reads and failed clicks indicating UI changes
- **Audit Trail**: Full audit logging of all evaluations, QA reviews, imports, and system actions
- **Import Bot Runs**: Upload JSON bot run files for evaluation through the QA pipeline
- **Live Bot Run Pipeline**: PMS Sandbox with 4 scenarios (clean, UI drift, loop/stall, field mismatch) — real event ingestion, live polling, and automatic evaluation
- **Dashboard Metrics**: Aggregate metrics by status, decision, workflow, PMS type, and evaluator failures
- **Optional LLM Summaries**: AI-assisted summaries for reviewer notes (never affects pass/fail)

## Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: lucide-react
- **Validation**: Zod
- **Storage**: In-memory (default) or Supabase
- **Vector Search**: Upstash Vector (optional, with Gemini embeddings)
- **Testing**: Vitest

## Architecture

```
lib/
  botops/
    config.ts          — Environment config (Supabase, Upstash, AI keys)
    versions.ts        — Schema version constants
    redaction.ts       — PHI redaction layer
    evaluate.ts        — Evaluate orchestrator
    scoring.ts         — Risk scoring & release readiness
    summarize.ts       — Deterministic + optional LLM summaries
    metrics.ts         — Dashboard metrics aggregation
    event-aggregation.ts — Derive entered/extracted fields from event stream
    pms-sandbox/
      pms-state.ts     — PMS sandbox state machine
      pms-actions.ts   — Bot action types & helpers
      event-builder.ts — Build BotRunEvent from state transitions
      scenarios.ts     — 4 live bot run scenarios
    evaluators/
      types.ts         — Evaluator interface & context
      field-accuracy.ts
      workflow-compliance.ts
      exception-handling.ts
      ui-drift.ts
      loop-stall-detection.ts
      latency.ts
      regression.ts
  schemas/
    bot-run.ts         — Zod schemas for all BotOps entities
  db/
    botops-store.ts    — BotOpsStore interface + in-memory implementation
    botops-supabase-store.ts — Supabase store (stub with fallback)
    botops-index.ts    — Store selector with seeding
  mock/
    sample-bot-runs.ts — 8 realistic sample bot runs
app/
  api/botops/
    runs/              — List, get, delete, evaluate, import, start, events, complete
    qa-review/         — QA review actions
    audit/             — Audit log
    search/            — Vector + text search
    demo/seed/         — Seed demo data
    demo/reset/        — Reset store
  pms-sandbox/         — Live PMS Sandbox with bot runner scenarios
  dashboard/           — BotOps dashboard
  runs/                — Bot runs list + detail (3-column)
  runs/import/         — Import bot run JSON
  qa-review/           — QA review queue
  drift/               — UI drift findings
  regression/          — Regression detection
  audit/               — Audit log
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

Key variables:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase storage
- `UPSTASH_VECTOR_URL`, `UPSTASH_VECTOR_TOKEN` — Vector search
- `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` — Redis cache
- `EMBEDDING_API_KEY`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL` — Gemini embeddings
- `AI_PROVIDER`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` — LLM for optional summaries

> All keys are optional — the app runs with in-memory storage and deterministic summaries by default.

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Live Bot Run Pipeline

The primary demo flow is the **PMS Sandbox** at `/pms-sandbox`:

1. **PMS Sandbox** simulates a pharmacy management system with screens (Patient Search, Patient Match, Prescription Entry, Insurance Check, Final Review)
2. **Bot Runner** is a visual client-side driver that steps through the PMS workflow, transitioning state and emitting events in real time
3. **Live Event Ingestion** — each bot action is sent to `POST /api/botops/runs/[runId]/events` one by one
4. **Replay Timeline** — `/runs/[runId]` polls every 1.5s and shows events appearing live while the bot is still running
5. **Evaluators** — after completion, `POST /api/botops/runs/[runId]/evaluate` runs all 7 evaluators with entered fields derived from the event stream
6. **Release Decision** — deterministic scoring produces the final QA decision

#### Scenarios

| Scenario | Expected Outcome |
|----------|----------------|
| Clean Success | `safe_to_automate` (score >= 90) |
| UI Drift | `ui_drift_detected` (low confidence + failed clicks) |
| Loop/Stall | `stop_automation` (repeated field entry 4x) |
| Failed Field Entry | `needs_qa_review` (field accuracy mismatch) |

### Seeding Demo Data (Secondary)

Click "Seed Demo Runs" in the top nav, or call:

```bash
curl -X POST http://localhost:3000/api/botops/demo/seed
```

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/botops/runs` | List bot runs (with filters) |
| GET | `/api/botops/runs/:runId` | Get run detail with events, results, comparisons |
| DELETE | `/api/botops/runs/:runId` | Delete a run |
| POST | `/api/botops/runs/start` | Start a live bot run (status: running) |
| POST | `/api/botops/runs/:runId/events` | Append a single event (with idempotency + step validation) |
| POST | `/api/botops/runs/:runId/complete` | Mark run as completed |
| POST | `/api/botops/runs/:runId/evaluate` | Run evaluators (derives entered fields from events) |
| POST | `/api/botops/runs/import` | Import a bot run JSON |
| GET | `/api/botops/qa-review` | List QA review actions |
| POST | `/api/botops/qa-review` | Submit a QA review action |
| GET | `/api/botops/audit` | Get audit logs |
| GET | `/api/botops/search?q=...` | Search runs (vector or text) |
| POST | `/api/botops/demo/seed` | Seed demo data |
| POST | `/api/botops/demo/reset` | Reset store |

## Evaluator Details

| Evaluator | What it checks |
|-----------|---------------|
| Field Accuracy | Expected vs actual field values with severity-weighted deductions |
| Workflow Compliance | Required screens visited in correct order |
| Exception Handling | Exceptions properly handed off to humans |
| UI Drift | Low confidence scores, failed clicks, selector mismatches |
| Loop/Stall Detection | Repeated actions (loop) and timeouts (stall) |
| Latency | Per-event and total run latency against thresholds |
| Regression | Performance vs captured baseline by workflow + bot version |

## Safety Principles

1. **Deterministic decisions** — All pass/fail and release decisions are deterministic. LLM never influences scoring.
2. **PHI redaction first** — PHI is redacted before any evaluation or storage.
3. **Explainability** — Every evaluator result includes findings, deduction reasons, and recommended actions.
4. **Audit trail** — Every evaluation, review action, and import is logged.
5. **No secrets committed** — `.env.local` is gitignored.

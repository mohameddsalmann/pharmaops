# PharmaOps Agentic Copilot

**BotOps QA & Replay Platform for Pharmacy Automation Bots**

PharmaGuard BotOps monitors, replays, evaluates, and certifies AI pharmacy bot runs across PMS systems. 7 deterministic evaluators, PHI redaction, risk scoring, and release readiness decisions — with full audit trails.

> **Safety Notice:** PHI is redacted before evaluation. LLM summaries are for reviewer notes only and never influence pass/fail or release decisions. All scoring and decisions are deterministic.

## Features

- **7 Deterministic Evaluators**: Field accuracy, workflow compliance, exception handling, UI drift, loops/stalls, latency, and regression detection — no LLM guesses in pass/fail decisions.
- **Workflow Spec Registry**: Versioned specs with SHA-256 hash verification. Expected values derived from specs, not from run requests.
- **Idempotent Run Completion**: `completeRun` with `completionClientId` and database-level atomic claim. Safe to retry. Resumes evaluation if partially done.
- **Separated Execution & Evaluation Status**: `executionStatus` (running/completed/failed/stalled) and `evaluationStatus` (pending/running/completed/failed) are distinct fields.
- **PHI Redaction**: Automatic redaction before evaluation. Safe for QA review.
- **HMAC-SHA256 Authentication**: Signed telemetry ingestion with timestamp + nonce replay protection.
- **Python SDK**: Drop-in integration for BotCity Maestro or standalone bots. SQLite event spooling with retry.
- **Full Audit Trail**: Every completion, evaluation, QA review action, and import is logged.
- **Live Status Indicators**: Homepage and integration page show dynamic readiness based on live API evidence.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Server Components) |
| Language | TypeScript 5.7 |
| Database | Supabase (PostgreSQL + RLS) |
| Replay Protection | Upstash Redis |
| Styling | Tailwind CSS |
| Testing | Vitest (TypeScript), pytest (Python) |
| CI | GitHub Actions |
| SDK | Python 3.9+ (pharmaguard_sdk) |

## Architecture

```
lib/
  botops/
    config.ts               — Environment config
    versions.ts             — Schema version constants
    redaction.ts            — PHI redaction layer
    evaluate.ts             — Evaluation orchestrator (spec-driven)
    scoring.ts              — Risk scoring & release readiness
    summarize.ts            — Deterministic + optional LLM summaries
    metrics.ts              — Dashboard metrics aggregation
    ingestion-services.ts   — Start, ingest, complete, fail, artifact services
    hmac.ts                 — HMAC-SHA256 auth + replay protection
    event-aggregation.ts    — Derive entered/extracted fields from events
    workflow-specs/
      registry.ts           — Spec registry with hash verification
      pioneer_prescription_intake_1.0.0.ts
      pioneer_data_entry_1.0.0.ts
    evaluators/
      types.ts              — Evaluator interface & context
      field-accuracy.ts
      workflow-compliance.ts
      exception-handling.ts
      ui-drift.ts
      loop-stall-detection.ts
      latency.ts
      regression.ts
  schemas/
    bot-run.ts              — Zod schemas (executionStatus, evaluationStatus, etc.)
  db/
    botops-store.ts         — BotOpsStore interface + memory store + claimCompletion
    botops-supabase-store.ts — Supabase store with atomic claim
    botops-index.ts         — Store selector
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.9+ (for SDK integration)
- Supabase project (optional — falls back to in-memory store in dev)

### Installation

```bash
git clone https://github.com/mohameddsalmann/pharmaops.git
cd pharmaops
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

See [`.env.example`](.env.example) for all environment variables and their descriptions.

### Database Migration

Run the migration in your Supabase SQL Editor:

```sql
-- File: supabase/migrations/00001_initial_schema.sql
-- Paste and execute the entire file contents
```

The migration is idempotent — safe to run multiple times.

### Development

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Testing

```bash
# TypeScript tests (excludes smoke tests)
npm test

# Python SDK tests
cd integrations/botcity
pip install -r requirements-dev.txt
pip install -e .
python -m pytest tests/ -v

# Deployment smoke tests (requires running deployment)
PHARMAGUARD_SMOKE_BASE_URL=https://your-deployment.vercel.app npm run test:smoke
```

## Run Lifecycle

1. **Start**: `POST /api/botops/runs` → creates run with `executionStatus=running`, `evaluationStatus=pending`
2. **Ingest Events**: `POST /api/botops/runs/:runId/events` → appends events with idempotency check
3. **Complete**: `POST /api/botops/runs/:runId/complete` → atomically claims completion, runs deterministic evaluation
4. **Evaluate**: 7 evaluators run against workflow spec expected values → `evaluationStatus=completed` or `failed`

### Status Fields

| Field | Values | Description |
|-------|--------|-------------|
| `executionStatus` | running, completed, failed, stalled | Bot execution lifecycle |
| `evaluationStatus` | pending, running, completed, failed | Evaluation lifecycle |
| `qaDecision` | safe_to_automate, needs_qa_review, regression_detected, ui_drift_detected, stop_automation, null | QA decision |

### Idempotent Completion

`completeRun` is truly idempotent:
- **running** → atomically claim completion (WHERE `execution_status = 'running'`), then evaluate
- **completed + evaluation completed** → return existing results (200)
- **completed + evaluation pending/failed** → safely resume evaluation
- **completed + evaluation running** → 409 "Evaluation in progress"
- **failed/stalled** → reject invalid completion

Uses `completionClientId` with a unique constraint for database-level idempotency.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check with Supabase/Redis/HMAC status |
| GET | `/api/readiness` | Readiness check with store/supabase/hmac checks |
| POST | `/api/botops/runs` | Start a new bot run |
| POST | `/api/botops/runs/:runId/events` | Ingest a telemetry event |
| POST | `/api/botops/runs/:runId/complete` | Complete run and trigger evaluation |
| POST | `/api/botops/runs/:runId/fail` | Fail a run |
| GET | `/api/botops/runs` | List runs (requires auth) |
| GET | `/api/botops/runs/:runId` | Get run detail |
| POST | `/api/botops/qa-review` | Submit QA review action |
| POST | `/api/botops/runs/import` | Import a run from JSON |

## Evaluators

| Evaluator | What it checks |
|-----------|---------------|
| Field Accuracy | Expected vs actual field values from workflow spec |
| Workflow Compliance | Required screens and step order |
| Exception Handling | Unhandled exceptions and error recovery |
| UI Drift | Screen name and UI fingerprint changes |
| Loop/Stall | Repeated actions and timeout detection |
| Latency | Duration against threshold |
| Regression | Score against captured baseline |

All evaluators are deterministic. LLM is used only for optional summary generation — never for scoring or decisions.

## Python SDK

```python
from pharmaguard_sdk import PharmaGuardClient

client = PharmaGuardClient(
    base_url="http://localhost:3000",
    api_key=os.environ["PHARMAGUARD_INGEST_KEY"],
)

session = client.start_run(
    pharmacy_id="PHARM-001",
    pharmacy_name="Central Pharmacy",
    pms_type="pioneer",
    workflow_type="prescription_intake",
    bot_version="1.0.0",
    workflow_spec_version="1.0.0",
)

session.emit_screen_read("Patient Search", "Read screen", 0.95, 1200)
session.emit_field_entry("Data Entry", "Entered fields", 0.91, 2200,
    entered_fields={"medicationName": "Lisinopril"})

session.complete(
    final_outcome="Prescription intake completed",
    processed_item_count=1,
)

# Replay URL is built dynamically from client base URL
print(f"Replay: {session.replay_url}")
```

See [`integrations/botcity/`](integrations/botcity/) for the full SDK source and BotCity Maestro adapter.

## Safety Principles

1. **Deterministic decisions** — All pass/fail and release decisions are deterministic. LLM never influences scoring.
2. **PHI redaction first** — PHI is redacted before any evaluation or storage.
3. **Explainability** — Every evaluator result includes findings, deduction reasons, and recommended actions.
4. **Audit trail** — Every completion, evaluation, review action, and import is logged.
5. **HMAC-SHA256** — All ingestion routes require signed requests with replay protection.
6. **Fail-closed in production** — Missing key = 503, not unauthenticated.

## CI

GitHub Actions runs TypeScript tests and Python SDK tests on every push/PR. No production dependencies required — CI uses empty env vars and in-memory stores.

## License

MIT

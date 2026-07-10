# Architecture

## Overview

PharmaOps is a Next.js 15 application that provides QA and certification for pharmacy automation bot runs. It receives signed telemetry from Python SDK clients, stores events, runs deterministic evaluation, and produces release readiness decisions.

## Components

### Ingestion Layer

- **`lib/botops/ingestion-services.ts`**: Core business logic for `startRun`, `ingestEvent`, `completeRun`, `failRun`, and `addArtifact`. Uses `runLocked` for per-run event ordering.
- **`lib/botops/hmac.ts`**: HMAC-SHA256 authentication with timestamp + nonce replay protection. Fail-closed in production.
- **API Routes**: `app/api/botops/runs/[runId]/events/route.ts`, `complete/route.ts`, etc.

### Storage Layer

- **`lib/db/botops-store.ts`**: `BotOpsStore` interface + in-memory implementation. Includes `claimCompletion` for atomic compare-and-set.
- **`lib/db/botops-supabase-store.ts`**: Supabase implementation with atomic `claimCompletion` using `UPDATE ... WHERE execution_status = 'running'`.
- **`lib/db/botops-index.ts`**: Store selector — uses Supabase if configured, falls back to memory.

### Evaluation Layer

- **`lib/botops/evaluate.ts`**: Orchestrator that runs all 7 evaluators and aggregates results.
- **`lib/botops/workflow-specs/registry.ts`**: Versioned spec registry with SHA-256 hash verification. `getExactWorkflowSpec` retrieves specs by PMS type, workflow type, and version.
- **`lib/botops/evaluators/`**: 7 deterministic evaluators (field-accuracy, workflow-compliance, exception-handling, ui-drift, loop-stall-detection, latency, regression).
- **`lib/botops/scoring.ts`**: Risk scoring and release readiness computation.
- **`lib/botops/summarize.ts`**: Deterministic summaries + optional LLM summaries (never affects scoring).

### Presentation Layer

- **`app/page.tsx`**: Homepage with dynamic readiness indicators (server-side fetch from `/api/readiness`).
- **`app/integration/page.tsx`**: Integration guide with dynamic HMAC/store status.
- **`app/dashboard/`**: Metrics dashboard.
- **`app/runs/[runId]/`**: Run detail with replay timeline, field comparisons, evaluator results.
- **`app/pms-sandbox/`**: Live PMS sandbox with bot runner scenarios.

## Data Flow

```
Python SDK → HMAC-signed POST → API Route → ingestion-services
  → store.createRun / store.addEvent / store.claimCompletion
  → evaluateBotRun (7 evaluators, spec-driven)
  → store.updateRun + store.setEvaluatorResults + store.setSummary
  → Response with final run + evaluation results
```

## Status Separation

Execution and evaluation are independent lifecycles:

| executionStatus | evaluationStatus | Meaning |
|----------------|-------------------|---------|
| running | pending | Bot is still executing |
| completed | pending | Bot done, evaluation not yet started |
| completed | running | Evaluation in progress |
| completed | completed | Fully evaluated — ready for QA review |
| completed | failed | Bot done, evaluation failed (retry-safe) |
| failed | pending | Bot failed — no evaluation needed |
| stalled | pending | Bot stalled — no evaluation needed |

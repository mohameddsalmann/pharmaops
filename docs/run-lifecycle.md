# Run Lifecycle

## Start

`POST /api/botops/runs` creates a new run:

- `executionStatus = "running"`
- `evaluationStatus = "pending"`
- `completionClientId = null`
- `status = "running"` (legacy field, kept for backward compatibility)

## Ingest Events

`POST /api/botops/runs/:runId/events` appends events:

- Checks `executionStatus === "running"` (rejects if not)
- Idempotency via `clientEventId` — returns existing event if duplicate
- Sequence number validation (must be exactly previous + 1)
- PHI redaction applied to extracted/entered fields

## Complete

`POST /api/botops/runs/:runId/complete` is the most critical operation:

### Idempotency States

| Current State | Action | Result |
|--------------|--------|--------|
| running | Atomically claim completion, evaluate | 200 with evaluated run |
| completed + eval completed | Return existing | 200 with existing run |
| completed + eval pending/failed | Resume evaluation | 200 with newly evaluated run |
| completed + eval running | Conflict | 409 "Evaluation in progress" |
| failed/stalled | Reject | 400 "Cannot complete a failed/stalled run" |

### Atomic Claim

The `claimCompletion` method in the store performs:

```sql
UPDATE botops_runs
SET execution_status = 'completed',
    completed_at = now(),
    completion_client_id = $clientId,
    final_outcome = $outcome
WHERE id = $runId AND execution_status = 'running'
RETURNING *;
```

If 0 rows returned, another instance already claimed it — re-fetch and return existing.

### Evaluation

After claiming completion:

1. Load workflow spec from registry via `getExactWorkflowSpec(pmsType, workflowType, version)`
2. Verify `workflowSpecHash` matches registry hash (integrity check)
3. Build `expectedFields` from spec's `requiredFields`
4. Derive `enteredFields` from event stream
5. Run `evaluateBotRun` with all 7 evaluators (deterministic, no LLM)
6. Store results, field comparisons, and summary
7. Set `evaluationStatus = "completed"`

### Evaluation Failure

If evaluation throws:

- `evaluationStatus = "failed"`
- `decision = "needs_qa_review"`
- Sanitized error message stored in audit log (max 200 chars, no newlines)
- Safe to retry — `completeRun` will resume on next call

## Fail

`POST /api/botops/runs/:runId/fail`:

- Only allowed when `executionStatus === "running"`
- Sets `executionStatus = "failed"`, `evaluationStatus = "pending"`
- No evaluation runs

## completionClientId

The `completionClientId` field enables database-level idempotency:

- Unique partial index: `WHERE completion_client_id IS NOT NULL`
- First completion attempt with a given `clientId` succeeds
- Retry with same `clientId` returns existing results
- Different `clientId` on already-completed run returns existing (not rejected)

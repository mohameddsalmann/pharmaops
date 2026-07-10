# Workflow Specs

## Overview

Workflow specs are the authoritative source for expected values in evaluation. They are **not** provided by the bot runner — they are loaded from the server-side spec registry.

## Registry

`lib/botops/workflow-specs/registry.ts` exports:

- `getExactWorkflowSpec(pmsType, workflowType, version)` — returns spec data or null
- `getAllWorkflowSpecs()` — returns all registered specs

Each spec entry contains:

```typescript
{
  id: string;              // Unique spec identifier
  hash: string;            // SHA-256 hash of spec content
  spec: {
    pmsType: string;
    workflowType: string;
    version: string;
    requiredScreens: string[];
    requiredFields: string[];
    // ... other spec fields
  }
}
```

## Hash Verification

When `completeRun` runs evaluation:

1. Load spec from registry using `getExactWorkflowSpec`
2. If `run.workflowSpecHash` is set, compare against `specData.hash`
3. If mismatch → evaluation fails with `needs_qa_review` and audit log entry `evaluation_spec_integrity_failed`
4. If match (or no recorded hash) → proceed with evaluation

This ensures the spec used for evaluation hasn't been tampered with since the run was recorded.

## Expected Fields

`expectedFields` for evaluation are built from the spec's `requiredFields`:

```typescript
for (const field of specData.spec.requiredFields) {
  expectedFields[field] = run.expectedFields[field] ?? "";
}
```

This means the **field names** come from the spec, not from the bot runner. The **values** may come from the run's `expectedFields` (set at start time) or default to empty string.

## Adding New Specs

1. Create a new file in `lib/botops/workflow-specs/` (e.g., `pioneer_new_workflow_1.0.0.ts`)
2. Export the spec definition
3. Register it in `registry.ts`
4. The hash is computed from the spec content — any change produces a new hash

/**
 * Shared Ingestion Services for PharmaGuard BotOps Platform
 *
 * Correction #5: Centralized business logic. Avoids duplicate logic across routes.
 * Correction #6: Atomic event ordering and sequence validation using a per-run promise queue.
 * Correction #8: Strict artifact restrictions (size, MIME, redacted enforcement, SHA-256).
 */
import { getBotOpsStore } from "@/lib/db/botops-index";
import { generateId, nowISO } from "@/lib/utils/id";
import {
  BOT_RUN_SCHEMA_VERSION,
  EVENT_SCHEMA_VERSION,
} from "@/lib/botops/versions";
import {
  ARTIFACT_MAX_SIZE_BYTES,
  ARTIFACT_ALLOWED_MIME_TYPES,
} from "@/lib/schemas/bot-run";
import type {
  BotRun,
  BotRunEvent,
  RunArtifact,
  PmsType,
  WorkflowType,
  Environment,
  BotRunStatus,
  BotOpsAuditLog,
} from "@/lib/schemas/bot-run";
import { createHash } from "crypto";

// ── In-Memory Queue/Mutex for Atomic Ingestion (Final Change #6) ──
const runLocks = new Map<string, Promise<void>>();

async function runLocked<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = runLocks.get(runId) ?? Promise.resolve();
  let resolveFn!: (value: T) => void;
  let rejectFn!: (reason: unknown) => void;
  const resultPromise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  const chained = currentLock.then(async () => {
    try {
      resolveFn(await fn());
    } catch (err) {
      rejectFn(err);
    }
  });
  runLocks.set(runId, chained.then(() => undefined, () => undefined));
  return resultPromise;
}

// ── Service Parameters ──

export interface StartRunParams {
  pharmacyId: string;
  pharmacyName: string;
  pmsType: PmsType;
  workflowType: WorkflowType;
  botVersion: string;
  environment: Environment;
  expectedFields?: Record<string, string>;
  baselineVersion?: string | null;
  scenarioId?: string | null;
  externalTaskId?: string;
  automationLabel?: string;
  runnerId?: string;
  workflowSpecVersion?: string;
}

export interface IngestEventPayload {
  stepNumber: number;
  screenName: string;
  actionType: BotRunEvent["actionType"];
  actionSummary: string;
  confidence: number;
  durationMs: number;
  status: BotRunEvent["status"];
  clientEventId?: string;
  extractedFields?: Record<string, unknown>;
  enteredFields?: Record<string, unknown>;
  screenText?: string;
  domSnapshot?: Record<string, unknown>;
  uiFingerprint?: string;
  beforeStateHash?: string;
  afterStateHash?: string;
  expectedNextAction?: string;
  actualNextAction?: string;
  sequenceNumber?: number; // BotCity sequential ordering
}

export interface ArtifactPayload {
  artifactType: RunArtifact["artifactType"];
  filename: string;
  mimeType: string;
  base64Payload: string; // Base64 content
  sha256: string; // SHA-256 provided by client
  redacted: true; // Enforced redacted: true (Correction #8)
  eventId?: string;
}

export interface CompleteRunParams {
  finalOutcome: string;
  status?: BotRunStatus;
  processedItemCount?: number;
  externalTaskStatus?: string;
}

export interface FailRunParams {
  failureReason: string;
  errorCode?: string;
}

// ── Ingestion Service Actions ──

/**
 * Start a bot run.
 */
export async function startRun(params: StartRunParams): Promise<BotRun> {
  const store = await getBotOpsStore();
  const runId = generateId();
  const runNumber = `BR-LIVE-${Date.now().toString(36).toUpperCase()}`;
  const now = nowISO();

  const run: BotRun = {
    id: runId,
    runNumber,
    pharmacyId: params.pharmacyId,
    pharmacyName: params.pharmacyName,
    pmsType: params.pmsType,
    workflowType: params.workflowType,
    botVersion: params.botVersion,
    environment: params.environment,
    startedAt: now,
    completedAt: null,
    status: "running",
    finalOutcome: "",
    containsPhi: false,
    phiRedacted: true,
    safeForReview: true,
    redactionFindings: [],
    overallScore: null,
    riskLevel: null,
    decision: null,
    mainFinding: null,
    recommendedAction: null,
    baselineVersion: params.baselineVersion ?? null,
    scenarioId: params.scenarioId ?? null,
    expectedFields: params.expectedFields ?? {},
    botRunSchemaVersion: BOT_RUN_SCHEMA_VERSION,
    releaseReadinessScore: null,
    mainRisk: null,
    recommendedEngineeringAction: null,
    recommendedQaAction: null,
    // BotCity / Spec additions
    externalTaskId: params.externalTaskId,
    automationLabel: params.automationLabel,
    runnerId: params.runnerId,
    workflowSpecVersion: params.workflowSpecVersion ?? "1.0.0",
    workflowSpecId: null,
    workflowSpecHash: null,
  };

  await store.createRun({ run, events: [] });
  await createAuditEvent({
    botRunId: runId,
    actorType: "system",
    actorName: "ingestion_service",
    action: "run_started",
    details: { runNumber, externalTaskId: params.externalTaskId },
  });

  return run;
}

/**
 * Ingest an event atomically.
 */
export async function ingestEvent(
  runId: string,
  payload: IngestEventPayload
): Promise<{ event: BotRunEvent; idempotent: boolean }> {
  return runLocked(runId, async () => {
    const store = await getBotOpsStore();
    const run = await store.getRun(runId);
    if (!run) {
      throw new Error("Run not found");
    }
    if (run.status !== "running") {
      throw new Error(`Run is not running (status: ${run.status})`);
    }

    // 1. Idempotency Check (Final Change #6)
    if (payload.clientEventId) {
      const existingEvents = await store.getEvents(runId);
      const dup = existingEvents.find((e) => e.clientEventId === payload.clientEventId);
      if (dup) {
        return { event: dup, idempotent: true };
      }
    }

    // 2. Sequence Validation
    const expectedStep = (await store.getRunEventsCount(runId)) + 1;
    const incomingStep = payload.sequenceNumber ?? payload.stepNumber;
    if (incomingStep !== expectedStep) {
      throw new Error(
        `Step number mismatch: expected ${expectedStep}, got ${incomingStep}`
      );
    }

    const event: BotRunEvent = {
      id: generateId(),
      botRunId: runId,
      stepNumber: expectedStep,
      timestamp: nowISO(),
      screenName: payload.screenName,
      actionType: payload.actionType,
      actionSummary: payload.actionSummary,
      confidence: payload.confidence,
      durationMs: payload.durationMs,
      status: payload.status,
      eventSchemaVersion: EVENT_SCHEMA_VERSION,
      receivedAt: nowISO(),
      clientEventId: payload.clientEventId,
      extractedFields: payload.extractedFields,
      enteredFields: payload.enteredFields,
      screenText: payload.screenText,
      domSnapshot: payload.domSnapshot,
      uiFingerprint: payload.uiFingerprint,
      beforeStateHash: payload.beforeStateHash,
      afterStateHash: payload.afterStateHash,
      expectedNextAction: payload.expectedNextAction,
      actualNextAction: payload.actualNextAction,
    };

    await store.appendEvent(runId, event);
    return { event, idempotent: false };
  });
}

/**
 * Add an artifact with strict security limits.
 */
export async function addArtifact(
  runId: string,
  payload: ArtifactPayload
): Promise<RunArtifact> {
  const store = await getBotOpsStore();
  const run = await store.getRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }

  // 1. Redacted validation (Correction #8)
  if (payload.redacted !== true) {
    throw new Error("Unredacted artifacts are strictly prohibited.");
  }

  // 2. MIME allowlist validation (Correction #8)
  if (!(ARTIFACT_ALLOWED_MIME_TYPES as readonly string[]).includes(payload.mimeType)) {
    throw new Error(`MIME type "${payload.mimeType}" is not allowed.`);
  }

  // 3. Payload size validation (Correction #8)
  const binaryBuffer = Buffer.from(payload.base64Payload, "base64");
  if (binaryBuffer.length > ARTIFACT_MAX_SIZE_BYTES) {
    throw new Error(`Artifact size exceeds maximum limit of 5MB.`);
  }

  // 4. SHA-256 validation (Correction #8)
  const computedHash = createHash("sha256").update(binaryBuffer).digest("hex");
  if (computedHash !== payload.sha256) {
    throw new Error("SHA-256 hash mismatch. File payload may be corrupted.");
  }

  // 5. Filename sanitization (Correction #8)
  const sanitizedFilename = sanitizeFilename(payload.filename);

  // Storage key (for MVP, memory storage or documented path)
  const storageKey = `runs/${runId}/artifacts/${generateId()}_${sanitizedFilename}`;

  const artifact: RunArtifact = {
    id: generateId(),
    runId,
    artifactType: payload.artifactType,
    filename: sanitizedFilename,
    mimeType: payload.mimeType,
    sizeBytes: binaryBuffer.length,
    storageKey,
    sha256: computedHash,
    redacted: true,
    createdAt: nowISO(),
    eventId: payload.eventId,
  };

  // Memory store gets the artifact added.
  await store.addArtifact(artifact);

  await createAuditEvent({
    botRunId: runId,
    actorType: "system",
    actorName: "ingestion_service",
    action: "artifact_attached",
    details: { artifactId: artifact.id, filename: sanitizedFilename, sizeBytes: artifact.sizeBytes },
  });

  return artifact;
}

/**
 * Complete a run.
 */
export async function completeRun(
  runId: string,
  params: CompleteRunParams
): Promise<BotRun> {
  const store = await getBotOpsStore();
  const run = await store.getRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }
  if (run.status !== "running") {
    throw new Error(`Run is not running (status: ${run.status})`);
  }

  const finalStatus = params.status ?? "completed";
  const updated: BotRun = {
    ...run,
    completedAt: nowISO(),
    status: finalStatus,
    finalOutcome: params.finalOutcome,
    processedItemCount: params.processedItemCount ?? run.processedItemCount,
    externalTaskStatus: params.externalTaskStatus ?? run.externalTaskStatus,
  };

  await store.updateRun(updated);
  await createAuditEvent({
    botRunId: runId,
    actorType: "system",
    actorName: "ingestion_service",
    action: "run_completed",
    details: { status: finalStatus, finalOutcome: params.finalOutcome },
  });

  return updated;
}

/**
 * Fail a run.
 */
export async function failRun(
  runId: string,
  params: FailRunParams
): Promise<BotRun> {
  const store = await getBotOpsStore();
  const run = await store.getRun(runId);
  if (!run) {
    throw new Error("Run not found");
  }
  if (run.status !== "running") {
    throw new Error(`Run is not running (status: ${run.status})`);
  }

  const updated: BotRun = {
    ...run,
    completedAt: nowISO(),
    status: "failed",
    finalOutcome: `Failed: ${params.failureReason}${params.errorCode ? ` (${params.errorCode})` : ""}`,
    externalTaskStatus: "Failed",
  };

  await store.updateRun(updated);
  await createAuditEvent({
    botRunId: runId,
    actorType: "system",
    actorName: "ingestion_service",
    action: "run_failed",
    details: { failureReason: params.failureReason, errorCode: params.errorCode },
  });

  return updated;
}

/**
 * Write an audit log entry.
 */
export async function createAuditEvent(params: {
  botRunId: string | null;
  actorType: "system" | "evaluator" | "human" | "import";
  actorName: string;
  action: string;
  details?: Record<string, unknown>;
}): Promise<BotOpsAuditLog> {
  const store = await getBotOpsStore();
  return store.addAuditLog({
    botRunId: params.botRunId,
    actorType: params.actorType,
    actorName: params.actorName,
    action: params.action,
    details: params.details ?? {},
  });
}

/**
 * Sanitize filename to prevent path traversal and remove control characters.
 */
function sanitizeFilename(filename: string): string {
  // Strip path traversal and directory structures
  const base = filename.replace(/^.*[\\\/]/, "");
  // Replace anything that is not alphanumeric, dots, dashes or underscores
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

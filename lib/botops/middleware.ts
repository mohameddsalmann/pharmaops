/**
 * PharmaGuard Ingestion Auth Middleware
 *
 * Correction #1: Fail-closed in production.
 * Correction #3: Verify HMAC before JSON parsing, using raw body bytes.
 * Correction #4: Nonce-based replay protection.
 */
import { NextRequest } from "next/server";
import {
  getIngestKey,
  isProduction,
  isInsecureDevAllowed,
  computeBodyHash,
  verifyHmac,
  checkTimestamp,
  getSignatureToleranceSeconds,
  HEADER_SIGNATURE,
  HEADER_TIMESTAMP,
  HEADER_NONCE,
} from "@/lib/botops/hmac";
import { getReplayStore } from "@/lib/botops/replay-store";

export interface AuthSuccess {
  ok: true;
  rawBody: Buffer;
}

export interface AuthFailure {
  ok: false;
  status: number;
  error: string;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Verify ingestion authentication on a Next.js API route request.
 *
 * This reads the raw body bytes BEFORE any JSON parsing — the HMAC
 * is verified against the exact request body.
 */
export async function verifyIngestAuth(req: NextRequest): Promise<AuthResult> {
  // Read raw body bytes first (Correction #3: verify before JSON parse)
  let rawBody: Buffer;
  try {
    const arrayBuffer = await req.arrayBuffer();
    rawBody = Buffer.from(arrayBuffer);
  } catch {
    return { ok: false, status: 400, error: "Unable to read request body" };
  }

  const key = getIngestKey();

  // ── Production behavior (Correction #1 & Final Change #1) ──
  if (isProduction()) {
    const { isProductionReplayConfigured } = await import("@/lib/botops/replay-store");
    if (!isProductionReplayConfigured()) {
      return {
        ok: false,
        status: 503,
        error: "Persistent replay protection is not configured",
      };
    }
    if (!key) {
      return {
        ok: false,
        status: 503,
        error: "HMAC ingest key not configured. Set PHARMAGUARD_INGEST_KEY in production.",
      };
    }
    // In production, HMAC is always mandatory
    return verifySignature(req, rawBody, key);
  }

  // ── Non-production behavior ──
  if (key) {
    // Key is set — verify even in dev
    return verifySignature(req, rawBody, key);
  }

  // Key is not set in non-production
  if (isInsecureDevAllowed()) {
    // Dev bypass allowed
    return { ok: true, rawBody };
  }

  // Not allowed — fail closed
  return {
    ok: false,
    status: 503,
    error:
      "HMAC ingest key not configured. Set PHARMAGUARD_INGEST_KEY or enable PHARMAGUARD_ALLOW_INSECURE_DEV=true for local development.",
  };
}

async function verifySignature(
  req: NextRequest,
  rawBody: Buffer,
  key: string
): Promise<AuthResult> {
  const signature = req.headers.get(HEADER_SIGNATURE);
  const timestamp = req.headers.get(HEADER_TIMESTAMP);
  const nonce = req.headers.get(HEADER_NONCE);

  if (!signature || !timestamp || !nonce) {
    return {
      ok: false,
      status: 401,
      error: "Missing required authentication headers: X-PharmaGuard-Signature, X-PharmaGuard-Timestamp, X-PharmaGuard-Nonce",
    };
  }

  // Validate timestamp skew
  if (!checkTimestamp(timestamp)) {
    return {
      ok: false,
      status: 401,
      error: "Timestamp is outside the allowed tolerance window",
    };
  }

  // Validate nonce format (must be non-empty)
  if (nonce.length < 8 || nonce.length > 128) {
    return {
      ok: false,
      status: 401,
      error: "Invalid nonce format",
    };
  }

  // Compute body hash and verify HMAC first
  const bodyHash = computeBodyHash(rawBody);
  const method = req.method;
  const path = new URL(req.url).pathname;

  if (!verifyHmac(signature, method, path, timestamp, nonce, bodyHash, key)) {
    return {
      ok: false,
      status: 401,
      error: "Invalid HMAC signature",
    };
  }

  // Atomically claim the nonce to prevent replay.
  // This is a single atomic operation — not check-then-set.
  // We verify HMAC first so that invalid signatures don't consume nonce slots.
  const replayStore = getReplayStore();
  const ttl = getSignatureToleranceSeconds() * 2; // 2x tolerance for safety
  const claimed = await replayStore.claimNonce(nonce, ttl);
  if (!claimed) {
    return {
      ok: false,
      status: 401,
      error: "Nonce has already been used (replay detected)",
    };
  }

  return { ok: true, rawBody };
}

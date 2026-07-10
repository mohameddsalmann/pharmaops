/**
 * HMAC Authentication for PharmaGuard Ingestion Routes
 *
 * Correction #1: Fail-closed in production. If PHARMAGUARD_INGEST_KEY is missing
 * in production, return 503. Never run unauthenticated in production.
 *
 * Correction #3: Canonical signature input uses raw request body bytes.
 * Format: METHOD_UPPERCASE\nNORMALIZED_PATH\nTIMESTAMP\nNONCE\nSHA256_RAW_BODY
 */
import { createHmac, createHash, timingSafeEqual } from "crypto";

// ── Header names ──
export const HEADER_SIGNATURE = "x-pharmaguard-signature";
export const HEADER_TIMESTAMP = "x-pharmaguard-timestamp";
export const HEADER_NONCE = "x-pharmaguard-nonce";

// ── Config readers ──

export function getIngestKey(): string | undefined {
  const key = process.env.PHARMAGUARD_INGEST_KEY;
  return key && key.length > 0 ? key : undefined;
}

export function getSignatureToleranceSeconds(): number {
  const raw = process.env.PHARMAGUARD_SIGNATURE_TOLERANCE_SECONDS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isInsecureDevAllowed(): boolean {
  if (isProduction()) return false;
  return process.env.PHARMAGUARD_ALLOW_INSECURE_DEV === "true";
}

// ── Crypto functions ──

/**
 * Compute SHA-256 hex digest of raw body bytes.
 */
export function computeBodyHash(rawBody: Buffer | Uint8Array): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

/**
 * Build the canonical string for HMAC signing.
 *
 * METHOD_UPPERCASE
 * NORMALIZED_PATH
 * TIMESTAMP
 * NONCE
 * SHA256_RAW_BODY
 */
export function buildCanonicalString(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string
): string {
  const normalizedPath = normalizePath(path);
  return `${method.toUpperCase()}\n${normalizedPath}\n${timestamp}\n${nonce}\n${bodyHash}`;
}

/**
 * Sign a payload with HMAC-SHA256.
 */
export function signPayload(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string,
  key: string
): string {
  const canonical = buildCanonicalString(method, path, timestamp, nonce, bodyHash);
  return createHmac("sha256", key).update(canonical).digest("hex");
}

/**
 * Verify an HMAC signature using constant-time comparison.
 */
export function verifyHmac(
  signature: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string,
  key: string
): boolean {
  const expected = signPayload(method, path, timestamp, nonce, bodyHash, key);
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Check if the timestamp is within the tolerance window.
 */
export function checkTimestamp(
  timestamp: string,
  toleranceSeconds?: number
): boolean {
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  const tolerance = toleranceSeconds ?? getSignatureToleranceSeconds();
  return Math.abs(now - ts) <= tolerance;
}

/**
 * Normalize a URL path for canonical signature.
 * Strips query string and trailing slashes, lowercases.
 */
function normalizePath(path: string): string {
  const qIdx = path.indexOf("?");
  const clean = qIdx >= 0 ? path.slice(0, qIdx) : path;
  return clean.replace(/\/+$/, "").toLowerCase();
}

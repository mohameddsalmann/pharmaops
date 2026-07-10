/**
 * Sandbox Session Management
 *
 * Uses a SEPARATE secret (PHARMAGUARD_SANDBOX_SESSION_SECRET) — never PHARMAGUARD_INGEST_KEY.
 * Demo tokens are short-lived, signed, and contain session limits.
 * Persistent counters (rate limiting, run/event counts) require Upstash in production.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// ── Constants ──

export const SANDBOX_MAX_PAYLOAD_BYTES = 100_000;
const SESSION_TTL_SECONDS = 15 * 60; // 15 minutes
const RATE_LIMIT_PER_MINUTE = 30;
const SESSION_ISSUE_PER_HOUR = 5;
const DEFAULT_MAX_RUNS = 5;
const DEFAULT_MAX_EVENTS_PER_RUN = 50;

const HEADER_DEMO_TOKEN = "x-pharmaguard-demo-token";

// ── Types ──

interface DemoSessionPayload {
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  maxRuns: number;
  maxEventsPerRun: number;
}

export interface ValidatedSandboxSession {
  sessionId: string;
  expiresAt: number;
  maxRuns: number;
  maxEventsPerRun: number;
}

// ── Environment helpers ──

export function isSandboxEnabled(): boolean {
  return process.env.PHARMAGUARD_ENABLE_PUBLIC_SANDBOX === "true";
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getSandboxSecret(): string | undefined {
  const secret = process.env.PHARMAGUARD_SANDBOX_SESSION_SECRET;
  return secret && secret.length > 0 ? secret : undefined;
}

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * In production with sandbox enabled, a persistent store (Upstash) is required.
 * Returns true if the sandbox can operate with persistent limits.
 */
export function isSandboxPersistentStoreAvailable(): boolean {
  if (!isProduction()) return true; // Dev can use in-memory
  return isUpstashConfigured();
}

/**
 * Returns true if the sandbox is properly configured and ready to operate.
 */
export function isSandboxConfigured(): boolean {
  if (!isSandboxEnabled()) return false;
  if (!getSandboxSecret()) return false;
  if (isProduction() && !isUpstashConfigured()) return false;
  return true;
}

// ── Token signing ──

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

// ── Session creation ──

export function createDemoSession(): { token: string; sessionId: string; expiresAt: number } | { error: string; status: number } {
  if (!isSandboxEnabled()) {
    return { error: "Sandbox is not enabled", status: 404 };
  }

  const secret = getSandboxSecret();
  if (!secret) {
    return { error: "Sandbox session secret not configured", status: 503 };
  }

  if (isProduction() && !isUpstashConfigured()) {
    return { error: "Persistent sandbox storage not configured", status: 503 };
  }

  const sessionId = `sb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;

  const payload: DemoSessionPayload = {
    sessionId,
    issuedAt,
    expiresAt,
    maxRuns: DEFAULT_MAX_RUNS,
    maxEventsPerRun: DEFAULT_MAX_EVENTS_PER_RUN,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = signPayload(payloadJson, secret);
  const token = `${Buffer.from(payloadJson).toString("base64")}.${signature}`;

  return { token, sessionId, expiresAt };
}

// ── Token validation ──

export function validateDemoToken(token: string): ValidatedSandboxSession | null {
  const secret = getSandboxSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, "base64").toString("utf8");
  } catch {
    return null;
  }

  if (!constantTimeEqual(signPayload(payloadJson, secret), signature)) {
    return null;
  }

  let payload: DemoSessionPayload;
  try {
    payload = JSON.parse(payloadJson) as DemoSessionPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now >= payload.expiresAt) return null;

  return {
    sessionId: payload.sessionId,
    expiresAt: payload.expiresAt,
    maxRuns: payload.maxRuns,
    maxEventsPerRun: payload.maxEventsPerRun,
  };
}

// ── Origin validation ──

/**
 * Validates the request Origin against PHARMAGUARD_APP_URL.
 * Does NOT trust Host or X-Forwarded-Host blindly.
 * Origin checking is CSRF mitigation, NOT authentication.
 */
export function validateSandboxOrigin(req: NextRequest): boolean {
  const appUrl = process.env.PHARMAGUARD_APP_URL;
  if (!appUrl) {
    // No configured app URL — reject in production, allow in dev
    return !isProduction();
  }

  let configuredOrigin: string;
  try {
    const url = new URL(appUrl);
    configuredOrigin = url.origin;
  } catch {
    return false;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    // Reject missing Origin on browser mutations in production
    return !isProduction();
  }

  try {
    const requestOrigin = new URL(origin).origin;
    return requestOrigin === configuredOrigin;
  } catch {
    return false;
  }
}

// ── Rate limiting ──

// In-memory fallback for dev only
const inMemoryRateCounts = new Map<string, { count: number; windowStart: number }>();
const inMemorySessionCounts = new Map<string, { count: number; windowStart: number }>();
const inMemoryRunCounts = new Map<string, number>();
const inMemoryEventCounts = new Map<string, number>();

function checkInMemoryRate(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = inMemoryRateCounts.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    inMemoryRateCounts.set(key, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

function checkInMemorySessionIssuance(ip: string): boolean {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const entry = inMemorySessionCounts.get(ip);
  if (!entry || now - entry.windowStart > hourMs) {
    inMemorySessionCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  return entry.count <= SESSION_ISSUE_PER_HOUR;
}

async function upstashIncr(key: string, expireSeconds: number): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 0;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(["INCR", key]),
  });
  if (!res.ok) throw new Error(`Upstash INCR error: ${res.status}`);
  const data = await res.json();
  const count = data.result ?? 0;

  if (count === 1) {
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EXPIRE", key, String(expireSeconds)]),
    });
  }

  return count;
}

/**
 * Check rate limit for sandbox actions by session ID and IP.
 * Returns true if within limits, false if exceeded.
 */
export async function checkSandboxRateLimit(sessionId: string, ip: string): Promise<boolean> {
  if (isUpstashConfigured()) {
    try {
      const key = `sandbox:rate:${sessionId}:${ip}`;
      const count = await upstashIncr(key, 60);
      return count <= RATE_LIMIT_PER_MINUTE;
    } catch {
      return false;
    }
  }
  return checkInMemoryRate(`rate:${sessionId}:${ip}`, RATE_LIMIT_PER_MINUTE, 60_000);
}

/**
 * Check rate limit for session issuance by IP.
 */
export async function checkSessionIssuanceRateLimit(ip: string): Promise<boolean> {
  if (isUpstashConfigured()) {
    try {
      const key = `sandbox:sessionissue:${ip}`;
      const count = await upstashIncr(key, 3600);
      return count <= SESSION_ISSUE_PER_HOUR;
    } catch {
      return false;
    }
  }
  return checkInMemorySessionIssuance(ip);
}

/**
 * Increment and check run count for a session.
 * Returns true if within maxRuns, false if exceeded.
 */
export async function incrementRunCount(sessionId: string, maxRuns: number): Promise<boolean> {
  if (isUpstashConfigured()) {
    try {
      const key = `sandbox:runs:${sessionId}`;
      const count = await upstashIncr(key, SESSION_TTL_SECONDS);
      return count <= maxRuns;
    } catch {
      return false;
    }
  }
  const current = (inMemoryRunCounts.get(sessionId) ?? 0) + 1;
  inMemoryRunCounts.set(sessionId, current);
  return current <= maxRuns;
}

/**
 * Increment and check event count for a run.
 * Returns true if within maxEventsPerRun, false if exceeded.
 */
export async function incrementEventCount(runId: string, sessionId: string, maxEvents: number): Promise<boolean> {
  if (isUpstashConfigured()) {
    try {
      const key = `sandbox:events:${runId}`;
      const count = await upstashIncr(key, SESSION_TTL_SECONDS);
      return count <= maxEvents;
    } catch {
      return false;
    }
  }
  const current = (inMemoryEventCounts.get(runId) ?? 0) + 1;
  inMemoryEventCounts.set(runId, current);
  return current <= maxEvents;
}

// ── Request helpers ──

export function getDemoTokenFromRequest(req: NextRequest): string | null {
  return req.headers.get(HEADER_DEMO_TOKEN);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Check actual body byte length (not Content-Length header).
 */
export function checkPayloadSize(rawBody: Buffer, maxBytes: number = SANDBOX_MAX_PAYLOAD_BYTES): boolean {
  return rawBody.length <= maxBytes;
}

/**
 * Validate Content-Type is application/json.
 */
export function checkContentType(req: NextRequest): boolean {
  const ct = req.headers.get("content-type");
  if (!ct) return false;
  return ct.toLowerCase().includes("application/json");
}

// ── Test helpers ──

export function _resetInMemorySandboxCounters(): void {
  inMemoryRateCounts.clear();
  inMemorySessionCounts.clear();
  inMemoryRunCounts.clear();
  inMemoryEventCounts.clear();
}

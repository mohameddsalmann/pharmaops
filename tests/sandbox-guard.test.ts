import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isSandboxEnabled,
  isSandboxConfigured,
  createDemoSession,
  validateDemoToken,
  validateSandboxOrigin,
  checkPayloadSize,
  checkContentType,
  SANDBOX_MAX_PAYLOAD_BYTES,
  _resetInMemorySandboxCounters,
} from "@/lib/botops/sandbox-session";

function createMockReq(opts: {
  origin?: string;
  contentType?: string;
  token?: string;
}): import("next/server").NextRequest {
  const headers = new Map<string, string>();
  if (opts.origin !== undefined) headers.set("origin", opts.origin);
  if (opts.contentType !== undefined) headers.set("content-type", opts.contentType);
  if (opts.token !== undefined) headers.set("x-pharmaguard-demo-token", opts.token);

  return {
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
  } as unknown as import("next/server").NextRequest;
}

describe("Sandbox Guard", () => {
  beforeEach(() => {
    vi.stubEnv("PHARMAGUARD_ENABLE_PUBLIC_SANDBOX", "true");
    vi.stubEnv("PHARMAGUARD_SANDBOX_SESSION_SECRET", "test-sandbox-secret-12345");
    vi.stubEnv("PHARMAGUARD_APP_URL", "http://localhost:3000");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    _resetInMemorySandboxCounters();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disabled sandbox → isSandboxEnabled false", () => {
    vi.stubEnv("PHARMAGUARD_ENABLE_PUBLIC_SANDBOX", "false");
    expect(isSandboxEnabled()).toBe(false);
  });

  it("enabled sandbox without secret → isSandboxConfigured false", () => {
    vi.stubEnv("PHARMAGUARD_SANDBOX_SESSION_SECRET", "");
    expect(isSandboxConfigured()).toBe(false);
  });

  it("enabled sandbox with secret → isSandboxConfigured true (dev)", () => {
    expect(isSandboxConfigured()).toBe(true);
  });

  it("createDemoSession returns token", () => {
    const result = createDemoSession();
    expect("error" in result).toBe(false);
    if ("token" in result) {
      expect(result.token).toBeTruthy();
      expect(result.sessionId).toBeTruthy();
      expect(result.expiresAt).toBeGreaterThan(0);
    }
  });

  it("validateDemoToken accepts valid token", () => {
    const result = createDemoSession();
    if ("token" in result) {
      const session = validateDemoToken(result.token);
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe(result.sessionId);
    }
  });

  it("validateDemoToken rejects invalid token", () => {
    const session = validateDemoToken("invalid.token.here");
    expect(session).toBeNull();
  });

  it("validateDemoToken rejects expired token", () => {
    vi.useFakeTimers();
    const result = createDemoSession();
    if ("token" in result) {
      vi.advanceTimersByTime(16 * 60 * 1000);
      const session = validateDemoToken(result.token);
      expect(session).toBeNull();
    }
    vi.useRealTimers();
  });

  it("missing demo token → null from validateDemoToken", () => {
    const session = validateDemoToken("");
    expect(session).toBeNull();
  });

  it("cross-origin → validateSandboxOrigin false", () => {
    const req = createMockReq({ origin: "http://evil.com" });
    expect(validateSandboxOrigin(req)).toBe(false);
  });

  it("same-origin → validateSandboxOrigin true", () => {
    const req = createMockReq({ origin: "http://localhost:3000" });
    expect(validateSandboxOrigin(req)).toBe(true);
  });

  it("missing origin in dev → allowed", () => {
    const req = createMockReq({});
    expect(validateSandboxOrigin(req)).toBe(true);
  });

  it("missing origin in production → rejected", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = createMockReq({});
    expect(validateSandboxOrigin(req)).toBe(false);
  });

  it("payload size check rejects oversized", () => {
    const oversized = Buffer.alloc(SANDBOX_MAX_PAYLOAD_BYTES + 1);
    expect(checkPayloadSize(oversized)).toBe(false);
  });

  it("payload size check accepts within limit", () => {
    const ok = Buffer.alloc(1000);
    expect(checkPayloadSize(ok)).toBe(true);
  });

  it("content-type check rejects non-json", () => {
    const req = createMockReq({ contentType: "text/plain" });
    expect(checkContentType(req)).toBe(false);
  });

  it("content-type check accepts json", () => {
    const req = createMockReq({ contentType: "application/json" });
    expect(checkContentType(req)).toBe(true);
  });

  it("ingest key never in sandbox token", () => {
    vi.stubEnv("PHARMAGUARD_INGEST_KEY", "super-secret-ingest-key");
    const result = createDemoSession();
    if ("token" in result) {
      expect(result.token).not.toContain("super-secret-ingest-key");
    }
  });

  it("sandbox token cannot validate with ingest key", () => {
    vi.stubEnv("PHARMAGUARD_INGEST_KEY", "different-key-entirely");
    const result = createDemoSession();
    if ("token" in result) {
      vi.stubEnv("PHARMAGUARD_SANDBOX_SESSION_SECRET", "different-key-entirely");
      const session = validateDemoToken(result.token);
      expect(session).toBeNull();
    }
  });
});

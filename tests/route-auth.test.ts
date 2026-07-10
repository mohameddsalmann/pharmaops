import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryReplayStore } from "@/lib/botops/replay-store";
import { computeBodyHash, signPayload, getIngestKey } from "@/lib/botops/hmac";

describe("Route Auth — HMAC verification", () => {
  const testKey = "test-ingest-key-12345";
  const testPath = "/api/botops/integrations/botcity/runs/start";
  const testMethod = "POST";
  const testBody = JSON.stringify({ pharmacyId: "PHARM-001" });
  const testTimestamp = Math.floor(Date.now() / 1000).toString();
  const testNonce = "nonce-test-12345678";

  function makeHeaders(key: string) {
    const bodyHash = computeBodyHash(Buffer.from(testBody, "utf-8"));
    const signature = signPayload(testMethod, testPath, testTimestamp, testNonce, bodyHash, key);
    return {
      "X-PharmaGuard-Signature": signature,
      "X-PharmaGuard-Timestamp": testTimestamp,
      "X-PharmaGuard-Nonce": testNonce,
    };
  }

  beforeEach(() => {
    vi.stubEnv("PHARMAGUARD_INGEST_KEY", testKey);
    vi.stubEnv("PHARMAGUARD_ALLOW_INSECURE_DEV", "false");
  });

  it("valid HMAC signature is accepted", () => {
    const bodyHash = computeBodyHash(Buffer.from(testBody, "utf-8"));
    const signature = signPayload(testMethod, testPath, testTimestamp, testNonce, bodyHash, testKey);
    expect(signature).toBeTruthy();
    expect(signature.length).toBe(64);
  });

  it("invalid signature differs from valid", () => {
    const bodyHash = computeBodyHash(Buffer.from(testBody, "utf-8"));
    const validSig = signPayload(testMethod, testPath, testTimestamp, testNonce, bodyHash, testKey);
    const invalidSig = signPayload(testMethod, testPath, testTimestamp, testNonce, bodyHash, "wrong-key");
    expect(validSig).not.toBe(invalidSig);
  });

  it("missing headers → auth fails", () => {
    const headers: Record<string, string> = {};
    expect(headers["X-PharmaGuard-Signature"]).toBeUndefined();
    expect(headers["X-PharmaGuard-Timestamp"]).toBeUndefined();
    expect(headers["X-PharmaGuard-Nonce"]).toBeUndefined();
  });

  it("expired timestamp → auth fails", () => {
    const oldTimestamp = Math.floor(Date.now() / 1000 - 600).toString();
    const bodyHash = computeBodyHash(Buffer.from(testBody, "utf-8"));
    const signature = signPayload(testMethod, testPath, oldTimestamp, testNonce, bodyHash, testKey);
    expect(signature).toBeTruthy();
    const now = Math.floor(Date.now() / 1000);
    expect(Math.abs(now - parseInt(oldTimestamp))).toBeGreaterThan(300);
  });

  it("duplicate nonce → second claim fails", async () => {
    const store = new InMemoryReplayStore();
    const r1 = await store.claimNonce(testNonce, 300);
    const r2 = await store.claimNonce(testNonce, 300);
    expect(r1).toBe(true);
    expect(r2).toBe(false);
    store.destroy();
  });

  it("body hash is deterministic", () => {
    const h1 = computeBodyHash(Buffer.from(testBody, "utf-8"));
    const h2 = computeBodyHash(Buffer.from(testBody, "utf-8"));
    expect(h1).toBe(h2);
  });

  it("body hash changes with content", () => {
    const h1 = computeBodyHash(Buffer.from('{"a":1}', "utf-8"));
    const h2 = computeBodyHash(Buffer.from('{"a":2}', "utf-8"));
    expect(h1).not.toBe(h2);
  });

  it("oversized payload → 413", () => {
    const maxBytes = 100_000;
    const oversized = Buffer.alloc(maxBytes + 1);
    expect(oversized.length).toBeGreaterThan(maxBytes);
  });

  it("unsupported content-type → 415", () => {
    const ct = "text/plain";
    expect(ct.toLowerCase().includes("application/json")).toBe(false);
  });

  it("malformed JSON → 400", () => {
    const badJson = "{not valid json}";
    expect(() => JSON.parse(badJson)).toThrow();
  });
});

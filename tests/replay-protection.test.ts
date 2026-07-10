import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InMemoryReplayStore, isProductionReplayConfigured, resetReplayStore } from "@/lib/botops/replay-store";

describe("Replay Protection — Atomic claimNonce", () => {
  let store: InMemoryReplayStore;

  beforeEach(() => {
    store = new InMemoryReplayStore();
  });

  afterEach(() => {
    store.destroy();
  });

  it("two simultaneous claimNonce with same nonce → exactly one true", async () => {
    const [r1, r2] = await Promise.all([
      store.claimNonce("nonce-same", 300),
      store.claimNonce("nonce-same", 300),
    ]);
    const results = [r1, r2].filter((r) => r === true);
    expect(results.length).toBe(1);
  });

  it("different nonces → both true", async () => {
    const [r1, r2] = await Promise.all([
      store.claimNonce("nonce-a", 300),
      store.claimNonce("nonce-b", 300),
    ]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });

  it("expired nonce is re-claimable after TTL", async () => {
    vi.useFakeTimers();
    const claimed1 = await store.claimNonce("nonce-expire", 60);
    expect(claimed1).toBe(true);

    vi.advanceTimersByTime(61 * 1000);

    const claimed2 = await store.claimNonce("nonce-expire", 60);
    expect(claimed2).toBe(true);
    vi.useRealTimers();
  });

  it("same nonce claimed twice sequentially → second is false", async () => {
    const r1 = await store.claimNonce("nonce-seq", 300);
    expect(r1).toBe(true);
    const r2 = await store.claimNonce("nonce-seq", 300);
    expect(r2).toBe(false);
  });

  it("production without Upstash → isProductionReplayConfigured false", () => {
    const origUrl = process.env.UPSTASH_REDIS_REST_URL;
    const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(isProductionReplayConfigured()).toBe(false);
    process.env.UPSTASH_REDIS_REST_URL = origUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
  });
});

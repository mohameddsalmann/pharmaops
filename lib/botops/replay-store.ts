/**
 * Replay Protection Store
 *
 * Uses nonce as replay-cache key with atomic claim operation.
 * TTL >= signature tolerance window.
 *
 * - Local development: InMemoryReplayStore
 * - Production: UpstashRedisReplayStore
 */

export interface ReplayStore {
  /**
   * Atomically claims a nonce. Returns true only when the nonce was
   * successfully claimed (i.e. it did not previously exist or has expired).
   * Returns false when the nonce already exists and is still valid.
   *
   * This is a single atomic operation — never check-then-set.
   */
  claimNonce(nonce: string, ttlSeconds: number): Promise<boolean>;
}

// ── In-Memory (local dev only) ──

export class InMemoryReplayStore implements ReplayStore {
  private seen = new Map<string, number>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    if (this.cleanupInterval && typeof this.cleanupInterval === "object" && "unref" in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Atomic check-and-set. No await between check and set, so this is
   * atomic on the Node.js single-threaded event loop.
   */
  async claimNonce(nonce: string, ttlSeconds: number): Promise<boolean> {
    const expiry = this.seen.get(nonce);
    if (expiry !== undefined && Date.now() <= expiry) {
      return false;
    }
    this.seen.set(nonce, Date.now() + ttlSeconds * 1000);
    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [nonce, expiry] of this.seen) {
      if (now > expiry) this.seen.delete(nonce);
    }
  }

  /** For testing — clear all entries. */
  clear(): void {
    this.seen.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ── Upstash Redis (production) ──

export class UpstashRedisReplayStore implements ReplayStore {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/+$/, "");
    this.token = token;
  }

  /**
   * Atomic claim using a single Redis command: SET key "1" NX EX ttl
   * Returns true if the key was set (nonce claimed), false if it already existed.
   */
  async claimNonce(nonce: string, ttlSeconds: number): Promise<boolean> {
    const key = `pharmaguard:nonce:${nonce}`;
    const result = await this.redisCommand(["SET", key, "1", "NX", "EX", String(ttlSeconds)]);
    return result === "OK";
  }

  private async redisCommand(args: string[]): Promise<string | null> {
    const res = await fetch(`${this.url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data.result ?? null;
  }
}

// ── Factory ──

let _store: ReplayStore | null = null;

export function getReplayStore(): ReplayStore {
  if (_store) return _store;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    _store = new UpstashRedisReplayStore(redisUrl, redisToken);
  } else {
    _store = new InMemoryReplayStore();
  }

  return _store;
}

/**
 * Returns true only when a production-grade persistent replay store is configured.
 */
export function isProductionReplayConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** For testing — reset the singleton. */
export function resetReplayStore(): void {
  if (_store && _store instanceof InMemoryReplayStore) {
    _store.destroy();
  }
  _store = null;
}

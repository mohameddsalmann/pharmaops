import { describe, it, expect } from "vitest";

/**
 * Portable deployment smoke tests.
 *
 * Usage:
 *   PHARMAGUARD_SMOKE_BASE_URL=https://your-deployment.vercel.app \
 *   PHARMAGUARD_INGEST_KEY=your-key \
 *   npm run test:smoke
 *
 * Do NOT set env vars inside package.json scripts — set them externally.
 */

const BASE_URL = process.env.PHARMAGUARD_SMOKE_BASE_URL || "";

function requireBaseUrl() {
  if (!BASE_URL) {
    throw new Error(
      "PHARMAGUARD_SMOKE_BASE_URL must be set to run smoke tests. Example:\n" +
      "  PHARMAGUARD_SMOKE_BASE_URL=https://your-deployment.vercel.app npm run test:smoke"
    );
  }
}

describe("deployment smoke tests", () => {
  it("GET /api/health returns 200 with application ok", async () => {
    requireBaseUrl();
    const res = await fetch(`${BASE_URL}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.application).toBe("ok");
  });

  it("GET /api/readiness returns 200 with store ok", async () => {
    requireBaseUrl();
    const res = await fetch(`${BASE_URL}/api/readiness`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ready");
    expect(body.checks.store.status).toBe("ok");
  });

  it("GET / (homepage) returns 200 and contains BotOps", async () => {
    requireBaseUrl();
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("BotOps");
  });

  it("GET /integration returns 200 and contains BotCity", async () => {
    requireBaseUrl();
    const res = await fetch(`${BASE_URL}/integration`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("BotCity");
  });

  it("GET /api/botops/runs returns 401 without auth", async () => {
    requireBaseUrl();
    const res = await fetch(`${BASE_URL}/api/botops/runs`);
    expect([401, 403]).toContain(res.status);
  });
});

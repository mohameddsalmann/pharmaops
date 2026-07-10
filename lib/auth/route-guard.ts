/**
 * Route Guard for Application User Authentication
 *
 * HMAC (PHARMAGUARD_INGEST_KEY) is for machine-to-machine automation telemetry ONLY.
 * These guards are for human/application routes that require user authentication
 * and role-based authorization.
 *
 * If user authentication/RBAC is not implemented yet, these routes return 503
 * in production with a clear configuration message.
 */

import { NextRequest, NextResponse } from "next/server";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export interface AuthGuardResult {
  ok: boolean;
  status?: number;
  error?: string;
  user?: { id: string; role: string };
}

/**
 * Require an authenticated application user.
 * In production without a user auth system, returns 503.
 * In dev, allows access with a warning.
 */
export async function requireUserAuth(_req: NextRequest): Promise<AuthGuardResult> {
  // TODO: Implement actual user session/token validation when auth system is added.
  // For now, this is a stub that blocks production access.

  if (isProduction()) {
    return {
      ok: false,
      status: 503,
      error: "User authentication is not configured. This route requires application user authentication.",
    };
  }

  return { ok: true, user: { id: "dev-user", role: "dev" } };
}

/**
 * Require QA Engineer or Admin role.
 */
export async function requireQaEngineer(_req: NextRequest): Promise<AuthGuardResult> {
  if (isProduction()) {
    return {
      ok: false,
      status: 503,
      error: "User authentication is not configured. This route requires QA Engineer or Admin authorization.",
    };
  }

  return { ok: true, user: { id: "dev-user", role: "qa_engineer" } };
}

/**
 * Require Admin role only.
 */
export async function requireAdmin(_req: NextRequest): Promise<AuthGuardResult> {
  if (isProduction()) {
    return {
      ok: false,
      status: 503,
      error: "User authentication is not configured. This route requires Admin authorization.",
    };
  }

  return { ok: true, user: { id: "dev-user", role: "admin" } };
}

/**
 * Guard for development-only routes. Returns 404 in production.
 */
export function requireDevOnly(): AuthGuardResult {
  if (isProduction()) {
    return { ok: false, status: 404, error: "Not found" };
  }
  return { ok: true };
}

/**
 * Helper to convert AuthGuardResult to NextResponse.
 */
export function guardResponse(result: AuthGuardResult): NextResponse | null {
  if (result.ok) return null;
  return NextResponse.json({ error: result.error }, { status: result.status });
}

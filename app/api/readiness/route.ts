import { NextResponse } from "next/server";
import { getBotOpsStore } from "@/lib/db/botops-index";
import { isSupabaseConfigured, getBotOpsConfig } from "@/lib/botops/config";
import { getIngestKey } from "@/lib/botops/hmac";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: string; detail?: string }> = {};

  // Check 1: Store backend
  try {
    const store = await getBotOpsStore();
    const runs = await store.listRuns();
    checks.store = {
      status: "ok",
      detail: `${runs.length} runs accessible`,
    };
  } catch (err) {
    checks.store = {
      status: "fail",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Check 2: Supabase configuration
  const cfg = getBotOpsConfig();
  const supabaseConfigured = isSupabaseConfigured(cfg);
  checks.supabase = {
    status: supabaseConfigured ? "configured" : "not_configured",
    detail: supabaseConfigured
      ? "Service role key present"
      : "Using memory store (dev mode)",
  };

  // Check 3: HMAC ingest key
  const ingestKey = getIngestKey();
  checks.hmac = {
    status: ingestKey ? "configured" : "not_configured",
    detail: ingestKey ? "Ingest signing key present" : "Ingest signing key missing",
  };

  // Check 4: Environment
  checks.environment = {
    status: process.env.NODE_ENV === "production" ? "production" : "development",
  };

  // Overall status
  const allOk = checks.store.status === "ok";
  const overall = allOk ? "ready" : "degraded";

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}

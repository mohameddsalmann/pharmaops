import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getBotOpsConfig, isSupabaseConfigured } from "@/lib/botops/config";
import { isProductionReplayConfigured } from "@/lib/botops/replay-store";
import { isSandboxEnabled } from "@/lib/botops/sandbox-session";
import { getIngestKey } from "@/lib/botops/hmac";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getBotOpsConfig();
  const supabaseConfigured = isSupabaseConfigured(cfg);

  let supabaseReachable = false;
  let schemaReady = false;

  if (supabaseConfigured) {
    try {
      const client = createClient(
        cfg.supabaseUrl!,
        cfg.supabaseServiceRoleKey ?? cfg.supabaseAnonKey!
      );
      const { error } = await client
        .from("botops_runs")
        .select("id", { count: "exact", head: true })
        .limit(1);

      if (!error) {
        supabaseReachable = true;
        schemaReady = true;
      } else if (error.code === "PGRST205") {
        supabaseReachable = true;
        schemaReady = false;
      } else {
        supabaseReachable = false;
        schemaReady = false;
      }
    } catch {
      supabaseReachable = false;
      schemaReady = false;
    }
  }

  const upstashConfigured = isProductionReplayConfigured();
  const hmacConfigured = !!getIngestKey();

  const body = {
    application: "ok",
    supabaseConfigured,
    supabaseReachable,
    schemaReady,
    upstashConfigured,
    sandboxEnabled: isSandboxEnabled(),
    hmacConfigured,
  };

  if (!schemaReady) {
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body);
}

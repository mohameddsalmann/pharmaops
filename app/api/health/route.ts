import { NextResponse } from "next/server";
import { getBotOpsConfig, isSupabaseConfigured } from "@/lib/botops/config";
import { isProductionReplayConfigured } from "@/lib/botops/replay-store";
import { isSandboxEnabled } from "@/lib/botops/sandbox-session";
import { getIngestKey } from "@/lib/botops/hmac";

export async function GET() {
  const cfg = getBotOpsConfig();

  return NextResponse.json({
    application: "ok",
    supabaseConfigured: isSupabaseConfigured(cfg),
    upstashConfigured: isProductionReplayConfigured(),
    sandboxEnabled: isSandboxEnabled(),
    hmacConfigured: !!getIngestKey(),
  });
}

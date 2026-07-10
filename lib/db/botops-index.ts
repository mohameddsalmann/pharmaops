import { getBotOpsConfig, isSupabaseConfigured } from "@/lib/botops/config";
import { getBotOpsMemoryStore } from "@/lib/db/botops-store";
import type { BotOpsStore } from "@/lib/db/botops-store";

interface GlobalStore {
  _botOpsStore?: BotOpsStore | null;
  _botOpsSeeded?: boolean;
}

function getGlobal(): GlobalStore {
  if (typeof globalThis !== "undefined") {
    return globalThis as unknown as GlobalStore;
  }
  return {} as GlobalStore;
}

export async function getBotOpsStore(): Promise<BotOpsStore> {
  const g = getGlobal();
  if (g._botOpsStore) return g._botOpsStore;

  const cfg = getBotOpsConfig();
  if (isSupabaseConfigured(cfg)) {
    try {
      const { getBotOpsSupabaseStore } = await import("@/lib/db/botops-supabase-store");
      const supaStore = getBotOpsSupabaseStore();
      if (supaStore) {
        g._botOpsStore = supaStore as BotOpsStore;
        return g._botOpsStore;
      }
    } catch {
      // fall through to memory store
    }
  }
  g._botOpsStore = getBotOpsMemoryStore();
  return g._botOpsStore;
}

export async function getSeededBotOpsStore(): Promise<BotOpsStore> {
  const g = getGlobal();
  const store = await getBotOpsStore();
  if (!g._botOpsSeeded) {
    await store.seed();
    g._botOpsSeeded = true;
  }
  return store;
}

export async function resetBotOpsStore(): Promise<void> {
  const g = getGlobal();
  const store = await getBotOpsStore();
  await store.reset();
  g._botOpsSeeded = false;
}

export function isUsingSupabase(): boolean {
  const cfg = getBotOpsConfig();
  return isSupabaseConfigured(cfg);
}

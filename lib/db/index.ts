import type { DemoStore } from "./types";
import { getMemoryStore } from "./memory-store";

let store: DemoStore | null = null;
let storePromise: Promise<DemoStore> | null = null;
let seeding: Promise<void> | null = null;

export function getStore(): DemoStore {
  if (store) return store;

  store = getMemoryStore();
  return store;
}

export async function getStoreAsync(): Promise<DemoStore> {
  if (store) return store;

  if (!storePromise) {
    storePromise = (async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && serviceRoleKey) {
        try {
          const { SupabaseStore } = await import("./supabase-store");
          store = new SupabaseStore(supabaseUrl, serviceRoleKey) as DemoStore;
        } catch {
          store = getMemoryStore();
        }
      } else {
        store = getMemoryStore();
      }
      return store;
    })();
  }
  return storePromise;
}

export async function getSeededStore(): Promise<DemoStore> {
  const s = getStore();
  if (!seeding) {
    seeding = (async () => {
      await s.seedDemoData();
      const { runQAPipeline } = await import("@/lib/agents/orchestrator");
      const cases = await s.listCases({});
      for (const c of cases) {
        if (c.status === "pending_qa") {
          await runQAPipeline(s, c.id);
        }
      }
    })();
  }
  await seeding;
  return s;
}

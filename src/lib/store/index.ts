import { DemoStore } from "./demo";
import type { Store } from "./types";

let store: Store | null = null;

export const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/** Con las variables de Supabase usa el servidor; si no, el modo demo local. */
export async function getStore(): Promise<Store> {
  if (store) return store;
  if (hasSupabase) {
    const { SupabaseStore } = await import("./supabase");
    store = new SupabaseStore();
  } else {
    store = new DemoStore();
  }
  return store!;
}

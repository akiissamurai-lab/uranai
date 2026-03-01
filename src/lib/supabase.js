import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/constants";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

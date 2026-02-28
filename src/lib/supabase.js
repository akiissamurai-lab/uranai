import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // ビルド時のプレレンダリングでは env が無い場合がある
    return null;
  }

  return createBrowserClient(url, key);
}

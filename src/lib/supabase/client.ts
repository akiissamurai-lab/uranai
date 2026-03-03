import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ用 Supabase クライアント。
 * Client Components で使用。
 * env未設定時は null を返す（UIでエラー表示可能にする）。
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

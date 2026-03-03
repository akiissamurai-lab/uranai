import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * サーバーサイド用 Supabase クライアント。
 * Server Components / Route Handlers で使用。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component からの set は無視
          }
        },
      },
    },
  );
}

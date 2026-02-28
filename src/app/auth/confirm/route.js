import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qxvfgiiqmjefjcelsycn.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_YzMA-AoimZ7_VRNHBhnsAw_7yD1-k3_";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const redirectTo = new URL(next, request.url);

  if (token_hash && type) {
    const cookieStore = await cookies();

    // Cookie を追跡するためのリストを用意
    const cookiesToSet = [];

    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
            // リダイレクトレスポンスにも設定するため保存
            cookiesToSet.push(...cookies);
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      const response = NextResponse.redirect(redirectTo);
      // セッション Cookie をリダイレクトレスポンスにコピー
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  return NextResponse.redirect(new URL("/?auth_error=true", request.url));
}

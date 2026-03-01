import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");           // PKCE フロー用
  const next = searchParams.get("next") ?? "/";

  // ── オープンリダイレクト防止: 同一オリジンの相対パスのみ許可 ──
  const safeNext = (next.startsWith("/") && !next.startsWith("//")) ? next : "/";
  const redirectTo = new URL(safeNext, request.url);

  // token_hash (implicit) か code (PKCE) のどちらかが必要
  if (!code && !(token_hash && type)) {
    return NextResponse.redirect(new URL("/?auth_error=invalid_params", request.url));
  }

  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  const cookiesToSet = [];

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
          cookiesToSet.push(...cookies);
        },
      },
    }
  );

  let error = null;

  if (code) {
    // ── PKCE フロー（@supabase/ssr デフォルト）──────────────────
    // ブラウザで生成された code_verifier を使って code → session に交換
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
    if (error) {
      console.error("PKCE exchangeCodeForSession failed:", error.message);
    }
  } else if (token_hash && type) {
    // ── Implicit フロー（レガシー / Magic Link）─────────────────
    const result = await supabase.auth.verifyOtp({ type, token_hash });
    error = result.error;
    if (error) {
      console.error("verifyOtp failed:", error.message);
    }
  }

  if (!error) {
    const response = NextResponse.redirect(redirectTo);
    // セッション Cookie をリダイレクトレスポンスにコピー
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  // エラー時: 理由をクエリパラメータで渡す
  const errorUrl = new URL("/?auth_error=true", request.url);
  if (error?.message) {
    errorUrl.searchParams.set("error_desc", error.message.slice(0, 100));
  }
  return NextResponse.redirect(errorUrl);
}

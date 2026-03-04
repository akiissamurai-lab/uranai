"use client";

import { useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const isConfigured = supabase !== null;

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError("認証の設定が完了していません。環境変数を確認してください。");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
    } catch {
      setError("Google認証の開始に失敗しました。設定を確認してください。");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="space-y-2 animate-fade-in-up">
          <Link
            href="/"
            className="text-amber-400 text-sm hover:text-amber-300"
          >
            &larr; Aira
          </Link>
          <h1 className="text-2xl font-bold text-amber-100">ログイン</h1>
          <p className="text-sm text-amber-200/60">
            Googleアカウントで約10秒ではじめられます
          </p>
        </div>

        {/* 設定未完了の警告 */}
        {!isConfigured && (
          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-3 text-sm text-yellow-300">
            Supabase の設定が未完了です。.env.local に NEXT_PUBLIC_SUPABASE_URL
            と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading || !isConfigured}
          className="animate-fade-in-up delay-2 w-full py-3 px-4 bg-white text-gray-800 font-medium
                     rounded-xl hover:bg-gray-100 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "接続中..." : "Googleでログイン"}
        </button>
      </div>
    </main>
  );
}

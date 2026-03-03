"use client";

import { useState, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

type View = "buttons" | "email-form" | "email-sent";

export default function LoginPage() {
  const [view, setView] = useState<View>("buttons");
  const [email, setEmail] = useState("");
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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("認証の設定が完了していません。環境変数を確認してください。");
      return;
    }
    if (!email.trim()) return;

    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      setView("email-sent");
    } catch {
      setError("メール送信に失敗しました。しばらく経ってからお試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="space-y-2">
          <Link
            href="/"
            className="text-amber-400 text-sm hover:text-amber-300"
          >
            &larr; Aira
          </Link>
          <h1 className="text-2xl font-bold text-amber-100">ログイン</h1>
          <p className="text-sm text-amber-200/60">
            アカウントでログインして占いを始めましょう。
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

        {/* ボタン表示 */}
        {view === "buttons" && (
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading || !isConfigured}
              className="w-full py-3 px-4 bg-white text-gray-800 font-medium
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-800/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0a0a0a] px-3 text-amber-200/40">
                  または
                </span>
              </div>
            </div>

            <button
              onClick={() => setView("email-form")}
              disabled={loading || !isConfigured}
              className="w-full py-3 px-4 bg-amber-900/30 border border-amber-700/30
                         text-amber-200 rounded-xl hover:bg-amber-900/50 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              メールでログイン
            </button>
          </div>
        )}

        {/* メール入力フォーム */}
        {view === "email-form" && (
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full py-3 px-4 bg-white/5 border border-amber-700/30
                         text-amber-100 rounded-xl placeholder:text-amber-200/30
                         focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 px-4 bg-amber-600 text-white font-medium
                         rounded-xl hover:bg-amber-500 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "送信中..." : "ログインリンクを送信"}
            </button>
            <button
              type="button"
              onClick={() => {
                setView("buttons");
                setError(null);
              }}
              className="text-sm text-amber-200/40 hover:text-amber-200/60"
            >
              &larr; 戻る
            </button>
          </form>
        )}

        {/* メール送信完了 */}
        {view === "email-sent" && (
          <div className="space-y-4">
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
              <p className="text-amber-200 text-sm">
                <span className="font-medium text-amber-100">{email}</span>
                {" "}にログインリンクを送信しました。
              </p>
              <p className="text-amber-200/50 text-xs mt-2">
                メールが届かない場合は迷惑メールフォルダを確認してください。
              </p>
            </div>
            <button
              onClick={() => {
                setView("buttons");
                setEmail("");
                setError(null);
              }}
              className="text-sm text-amber-200/40 hover:text-amber-200/60"
            >
              &larr; やり直す
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";

// In-Appブラウザ検知
function detectInAppBrowser() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/Line\//i.test(ua)) return "LINE";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  if (/Twitter|X\//i.test(ua)) return "X (Twitter)";
  return null;
}

export default function AuthGate({ supabase, onAuthChange }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState("magic"); // magic | login | signup
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error | rate_limit
  const [errorMsg, setErrorMsg] = useState("");
  const [inAppBrowser, setInAppBrowser] = useState(null);

  useEffect(() => {
    setInAppBrowser(detectInAppBrowser());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      onAuthChange(user);
    }).catch(() => {
      // ネットワークエラー等: ゲスト扱い
      setUser(null);
      onAuthChange(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;

      // セッション期限切れ・リフレッシュ失敗 → 安全にゲストモードへ
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" && !session) {
        setUser(null);
        onAuthChange(null);
        return;
      }

      // 別タブでログイン/ログアウトした場合もリアルタイム反映
      setUser(currentUser);
      onAuthChange(currentUser);
    });

    return () => subscription.unsubscribe();
  }, [supabase, onAuthChange]);

  const resetForm = () => {
    setShowForm(false);
    setStatus("idle");
    setErrorMsg("");
    setEmail("");
    setPassword("");
    setMode("login");
  };

  // パスワードでログイン
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("Login error:", error.message);
      if (error.message.includes("Email not confirmed")) {
        setErrorMsg("メールアドレスが未確認です。受信箱の確認メールのリンクをクリックしてください");
      } else if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("メールアドレスまたはパスワードが正しくありません");
      } else {
        setErrorMsg(error.message);
      }
      setStatus("error");
    } else {
      resetForm();
    }
  };

  // パスワードでサインアップ
  const handlePasswordSignup = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password.length < 6) {
      setErrorMsg("パスワードは6文字以上にしてください");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      console.error("Signup error:", error.message);
      if (error.message.includes("already registered")) {
        setErrorMsg("このメールアドレスは登録済みです。ログインしてください");
      } else if (error.message.includes("rate limit")) {
        setErrorMsg("送信制限中です。しばらく待ってください");
        setStatus("rate_limit");
        return;
      } else {
        setErrorMsg(error.message);
      }
      setStatus("error");
    } else if (data.session) {
      // メール確認不要（auto-confirm）→ 即ログイン
      resetForm();
    } else {
      // メール確認が必要
      setStatus("sent");
    }
  };

  // Magic Link
  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      console.error("Magic Link error:", error.message);
      if (error.message.includes("rate limit")) {
        setStatus("rate_limit");
        setErrorMsg("送信制限中です。しばらく待ってください");
      } else {
        setErrorMsg(error.message);
        setStatus("error");
      }
    } else {
      setStatus("sent");
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("ログアウトしますか？")) return;
    await supabase.auth.signOut();
    resetForm();
  };

  // ─── ログイン済み ───
  if (user) {
    const initial = (user.email || "?")[0].toUpperCase();
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={handleLogout}
          title={`${user.email}\n(タップでログアウト)`}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "#fff",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="ログアウト"
        >
          {initial}
        </button>
      </div>
    );
  }

  // ─── 未ログイン ───
  const isBusy = status === "sending";

  const handleSubmit =
    mode === "magic"
      ? handleSendMagicLink
      : mode === "signup"
        ? handlePasswordSignup
        : handlePasswordLogin;

  const submitLabel =
    mode === "magic"
      ? "認証メールを送信"
      : mode === "signup"
        ? "新規登録"
        : "ログイン";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => {
          if (showForm) {
            resetForm();
          } else {
            setShowForm(true);
          }
        }}
        style={{
          padding: "8px 18px",
          minHeight: 44,
          borderRadius: 10,
          border: "1px solid rgba(102,126,234,0.4)",
          background: "linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))",
          color: "#c4b5fd",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 5,
          transition: "all 0.2s",
        }}
        aria-label="ログイン"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        ログイン
      </button>

      {showForm && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            background: "#1e1e2e",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 16,
            width: 280,
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* In-Appブラウザ警告 */}
          {inAppBrowser && (
            <div style={{
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              borderRadius: 8, padding: "8px 10px", marginBottom: 10, lineHeight: 1.5,
            }}>
              <p style={{ color: "#fbbf24", fontSize: 11, fontWeight: 600, margin: 0 }}>
                ⚠ {inAppBrowser}のアプリ内ブラウザです
              </p>
              <p style={{ color: "rgba(251,191,36,0.7)", fontSize: 10, margin: "4px 0 0" }}>
                ログイン後のセッションが保持されない場合があります。Safari / Chrome で開き直してください。
              </p>
            </div>
          )}

          {/* 送信完了 */}
          {status === "sent" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a0e0a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <p style={{ color: "#a0e0a0", fontSize: 13, margin: 0 }}>
                {mode === "signup"
                  ? "確認メールを送信しました"
                  : "メールを送信しました"}
              </p>
              <p style={{ color: "#888", fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>
                {mode === "signup"
                  ? "メール内のリンクをタップして登録を完了 → ここに戻ってパスワードでログインしてください"
                  : "メール内のリンクをタップしてログイン"}
              </p>
              {mode === "signup" && (
                <button
                  onClick={() => { setMode("login"); setStatus("idle"); setErrorMsg(""); }}
                  style={{
                    marginTop: 10, padding: "8px 16px", borderRadius: 8,
                    border: "1px solid rgba(102,126,234,0.3)",
                    background: "rgba(102,126,234,0.1)", color: "#a0b4ff",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
                  }}
                >
                  確認済み → ログインへ
                </button>
              )}
              <p style={{ color: "#777", fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
                届かない場合は迷惑メールフォルダを確認してください。
                <br />
                数分待っても届かない場合は再度お試しください。
              </p>
              <button
                onClick={resetForm}
                style={{
                  marginTop: 12,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#888",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                閉じる
              </button>
            </div>
          ) : (
            <>
              {/* モード切替タブ */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  marginBottom: 12,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {[
                  { key: "magic", label: "メール認証" },
                  { key: "login", label: "ログイン" },
                  { key: "signup", label: "新規登録" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setMode(key);
                      setStatus("idle");
                      setErrorMsg("");
                    }}
                    style={{
                      flex: 1,
                      padding: "6px 0",
                      border: "none",
                      background:
                        mode === key
                          ? "rgba(102,126,234,0.3)"
                          : "transparent",
                      color:
                        mode === key
                          ? "#a0b4ff"
                          : "rgba(255,255,255,0.35)",
                      fontSize: 11,
                      fontWeight: mode === key ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* フォーム */}
              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  required
                  autoComplete="email"
                  style={inputStyle}
                  aria-label="メールアドレス"
                />

                {/* パスワード欄（login / signup のみ） */}
                {mode !== "magic" && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup"
                        ? "パスワード（6文字以上）"
                        : "パスワード"
                    }
                    required
                    minLength={mode === "signup" ? 6 : undefined}
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    style={{ ...inputStyle, marginTop: 8 }}
                    aria-label="パスワード"
                  />
                )}

                {/* エラーメッセージ */}
                {errorMsg && (
                  <p
                    style={{
                      color: "#f87171",
                      fontSize: 11,
                      margin: "6px 0 0",
                      lineHeight: 1.4,
                    }}
                  >
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isBusy || status === "rate_limit"}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "9px 0",
                    borderRadius: 8,
                    border: "none",
                    background:
                      isBusy || status === "rate_limit"
                        ? "#555"
                        : "linear-gradient(135deg, #667eea, #764ba2)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor:
                      isBusy || status === "rate_limit"
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {isBusy ? "処理中..." : submitLabel}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

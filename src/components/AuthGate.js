"use client";

import { useState, useEffect } from "react";

export default function AuthGate({ supabase, onAuthChange }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      onAuthChange(user);
    });

    // リアルタイムの認証状態変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      onAuthChange(currentUser);
    });

    return () => subscription.unsubscribe();
  }, [supabase, onAuthChange]);

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } else {
      setStatus("sent");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowForm(false);
    setStatus("idle");
    setEmail("");
  };

  // ログイン済み: アバター + ログアウト
  if (user) {
    const initial = (user.email || "?")[0].toUpperCase();
    return (
      <div style={{ position: "relative", display: "inline-block" }}>
        <button
          onClick={handleLogout}
          title={`${user.email}\n(タップでログアウト)`}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            color: "#fff",
            border: "none",
            fontSize: 14,
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

  // 未ログイン: ログインボタン + スライドフォーム
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => {
          setShowForm(!showForm);
          setStatus("idle");
        }}
        style={{
          padding: "4px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.1)",
          color: "#e0e0e0",
          fontSize: 12,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        aria-label="ログイン"
      >
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
            width: 260,
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {status === "sent" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📧</div>
              <p style={{ color: "#a0e0a0", fontSize: 13, margin: 0 }}>
                メールを送信しました
              </p>
              <p
                style={{
                  color: "#888",
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                メール内のリンクをタップしてログイン
              </p>
              <button
                onClick={() => {
                  setShowForm(false);
                  setStatus("idle");
                  setEmail("");
                }}
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
            <form onSubmit={handleSendMagicLink}>
              <p
                style={{
                  color: "#ccc",
                  fontSize: 12,
                  margin: "0 0 8px",
                }}
              >
                メールでログイン
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                aria-label="メールアドレス"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  background:
                    status === "sending"
                      ? "#555"
                      : "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    status === "sending" ? "not-allowed" : "pointer",
                }}
              >
                {status === "sending"
                  ? "送信中..."
                  : status === "error"
                    ? "エラー。もう一度お試しください"
                    : "ログインリンクを送信"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

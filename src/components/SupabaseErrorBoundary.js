"use client";

import React, { useEffect } from "react";

// ─── Supabase Auth エラー抑制（既存機能を維持）─────────────────
function SupabaseErrorSuppressor({ children }) {
  useEffect(() => {
    const handler = (event) => {
      const reason = event.reason;
      if (
        reason?.name === "AuthApiError" ||
        reason?.name === "AuthRetryableFetchError" ||
        reason?.name === "AuthSessionMissingError" ||
        reason?.message?.includes?.("Auth session missing") ||
        reason?.message?.includes?.("Invalid Refresh Token") ||
        reason?.message?.includes?.("refresh_token_not_found") ||
        (reason instanceof Event) ||
        (typeof reason === "object" && reason !== null && reason.type === "error" && !reason.message)
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return children;
}

// ─── React Error Boundary（レンダーエラーをキャッチ）────────────
class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            maxWidth: 380,
            width: "100%",
            textAlign: "center",
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              fontSize: 24,
            }}>
              !
            </div>
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              margin: "0 0 8px",
            }}>
              エラーが発生しました
            </h1>
            <p style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}>
              画面の表示中に問題が発生しました。再読み込みしてください。
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                戻る
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "12px 24px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
                }}
              >
                再読み込み
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── 統合エクスポート ─────────────────────────────────────────
export default function SupabaseErrorBoundary({ children }) {
  return (
    <ErrorBoundaryInner>
      <SupabaseErrorSuppressor>
        {children}
      </SupabaseErrorSuppressor>
    </ErrorBoundaryInner>
  );
}

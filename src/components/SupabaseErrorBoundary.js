"use client";

import { useEffect } from "react";

/**
 * Supabase クライアントの内部fetch（トークンリフレッシュ等）が
 * Next.js dev の unhandledrejection ハンドラーに引っかかる問題を抑制。
 * 本番ビルドでは影響なし。
 */
export default function SupabaseErrorBoundary({ children }) {
  useEffect(() => {
    const handler = (event) => {
      const reason = event.reason;

      // Supabase内部のAuthエラー（トークン期限切れ、ネットワーク等）を抑制
      if (
        reason?.name === "AuthApiError" ||
        reason?.name === "AuthRetryableFetchError" ||
        reason?.name === "AuthSessionMissingError" ||
        reason?.message?.includes?.("Auth session missing") ||
        reason?.message?.includes?.("Invalid Refresh Token") ||
        reason?.message?.includes?.("refresh_token_not_found") ||
        // fetch由来の Event オブジェクトも抑制
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

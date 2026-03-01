// ─── AI / Anthropic ─────────────────────────────────────────────
export const AI = {
  MACRO_MODEL: "claude-haiku-4-5-20251001",  // PFC推測・食事アドバイス（コスト最適化）
  COACH_MODEL: "claude-sonnet-4-20250514",   // AIコーチ分析（品質重視）
  API_VERSION: "2023-06-01",
  MACRO_MAX_TOKENS: 1000,
  COACH_MAX_TOKENS: 2500,
  MAX_PROMPT_LENGTH: 5000,
  TIMEOUT_MS: 15000,
};

// ─── Rate Limit (Upstash) ───────────────────────────────────────
export const RATE_LIMIT = {
  REQUESTS: 3,
  WINDOW: "60 s",
  PREFIX: "macro-builder",
};

// ─── Daily/Weekly Hard Limits (Upstash) ─────────────────────────
export const DAILY_LIMIT = {
  MACRO_REQUESTS: 10,
  MACRO_WINDOW: "1 d",
  MACRO_PREFIX: "daily-macro",
  COACH_REQUESTS: 2,
  COACH_WINDOW: "7 d",
  COACH_PREFIX: "weekly-coach",
};

// ─── Supabase 環境変数 ─────────────────────────────────────────
// NEXT_PUBLIC_* は公開前提の値。Vercel 環境変数が未設定の場合はフォールバック。
const SUPABASE_FALLBACK_URL = "https://qxvfgiiqmjefjcelsycn.supabase.co";
const SUPABASE_FALLBACK_ANON_KEY = "sb_publishable_YzMA-AoimZ7_VRNHBhnsAw_7yD1-k3_";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_FALLBACK_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_FALLBACK_ANON_KEY;
  if (url === SUPABASE_FALLBACK_URL) {
    console.warn("[Supabase] NEXT_PUBLIC_SUPABASE_URL が未設定 — フォールバック値を使用中。Vercel の環境変数に追加してください。");
  }
  return { url, anonKey };
}

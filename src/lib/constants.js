// ─── AI / Anthropic ─────────────────────────────────────────────
export const AI = {
  MODEL: "claude-sonnet-4-20250514",
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

// ─── Supabase 環境変数 ─────────────────────────────────────────
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。.env.local または Vercel の環境変数を確認してください。"
    );
  }
  return { url, anonKey };
}

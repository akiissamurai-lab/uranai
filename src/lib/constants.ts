/**
 * ビジネスルール変数。PMが調整する際はこのファイルだけ変更。
 */
export const CONFIG = {
  // === 無料/有料ルール ===
  FREE_PER_DAY: 3,
  PREMIUM_PER_DAY: 3,
  MONTHLY_CREDITS: 10,
  PRICE_JPY: 480,

  // === AI ===
  MAX_TOKENS_FREE: 2500,
  MAX_TOKENS_PREMIUM: 4500,
  MAX_TOKENS_FOLLOWUP: 2500,
  MAX_TOKENS_DAILY: 900,
  MAX_FREETEXT_LENGTH: 200,
  TEMPERATURE: 0.8,

  // === キャッシュ ===
  CACHE_TTL_HOURS: 24,
  FREETEXT_HASH_LENGTH: 80,

  // === レート制限 ===
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW_SEC: 300, // 5min

  // === 履歴 ===
  FREE_HISTORY_LIMIT: 3,
} as const;

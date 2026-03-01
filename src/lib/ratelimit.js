import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT, DAILY_LIMIT } from "@/lib/constants";

// ── 遅延初期化（Lazy Init）─────────────────────────────────────
// モジュール読み込み時に Redis.fromEnv() が走ると
// 環境変数未設定の環境で API ルート全体がクラッシュする。
// → 初回呼び出し時にだけインスタンスを生成する。

function hasRedisEnv() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// ── バースト保護（3回/60秒 — IP単位）───────────────────────────
let _ratelimit = null;

export function getRatelimit() {
  if (_ratelimit) return _ratelimit;
  if (!hasRedisEnv()) return null;

  _ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT.REQUESTS, RATE_LIMIT.WINDOW),
    prefix: RATE_LIMIT.PREFIX,
  });
  return _ratelimit;
}

// ── 日次ハードリミット /api/macro（10回/日 — ユーザー単位）──────
let _dailyMacro = null;

export function getDailyMacroLimit() {
  if (_dailyMacro) return _dailyMacro;
  if (!hasRedisEnv()) return null;

  _dailyMacro = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(DAILY_LIMIT.MACRO_REQUESTS, DAILY_LIMIT.MACRO_WINDOW),
    prefix: DAILY_LIMIT.MACRO_PREFIX,
  });
  return _dailyMacro;
}

// ── 週次ハードリミット /api/ai-coach（2回/週 — ユーザー単位）───
let _weeklyCoach = null;

export function getWeeklyCoachLimit() {
  if (_weeklyCoach) return _weeklyCoach;
  if (!hasRedisEnv()) return null;

  _weeklyCoach = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.fixedWindow(DAILY_LIMIT.COACH_REQUESTS, DAILY_LIMIT.COACH_WINDOW),
    prefix: DAILY_LIMIT.COACH_PREFIX,
  });
  return _weeklyCoach;
}

/**
 * リクエストからIPアドレスを取得する。
 * Vercel では x-forwarded-for、ローカルでは 127.0.0.1 をフォールバック。
 */
export function getIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

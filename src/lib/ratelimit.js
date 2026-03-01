import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMIT } from "@/lib/constants";

// ── 遅延初期化（Lazy Init）─────────────────────────────────────
// モジュール読み込み時に Redis.fromEnv() が走ると
// 環境変数未設定の環境で API ルート全体がクラッシュする。
// → 初回呼び出し時にだけインスタンスを生成する。
let _ratelimit = null;

export function getRatelimit() {
  if (_ratelimit) return _ratelimit;

  // 環境変数が揃っていない場合は null を返す（フォールスルー）
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  _ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT.REQUESTS, RATE_LIMIT.WINDOW),
    prefix: RATE_LIMIT.PREFIX,
  });
  return _ratelimit;
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

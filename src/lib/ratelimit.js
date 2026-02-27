import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 1分間に3回まで（スライディングウィンドウ方式）
export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  prefix: "macro-builder",
});

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

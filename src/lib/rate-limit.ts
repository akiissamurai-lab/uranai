import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { CONFIG } from "./constants";

/**
 * Upstash Redis ベースのレート制限。
 * sliding window アルゴリズム。
 * env未設定時はレート制限を無効化（開発用）。
 */

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Upstash Redis not configured. Rate limiting disabled.");
    return null;
  }

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(
      CONFIG.RATE_LIMIT_REQUESTS,
      `${CONFIG.RATE_LIMIT_WINDOW_SEC} s`,
    ),
    analytics: true,
    prefix: "fortune:ratelimit",
  });

  return ratelimit;
}

/**
 * レート制限チェック。超過していれば false を返す。
 * Upstash未設定時は常に true（開発時の利便性）。
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const rl = getRatelimit();
  if (!rl) return true;

  const { success } = await rl.limit(userId);
  return success;
}

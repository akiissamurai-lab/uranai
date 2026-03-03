import { prisma } from "./prisma";
import { getJSTDateString } from "./cache";
import { CONFIG } from "./constants";

export interface UsageCheckResult {
  allowed: boolean;
  reason?: "daily_limit_reached";
  freeCount: number;
  premiumCount: number;
  freeRemaining: number;
  premiumRemaining: number;
}

/**
 * 日次制限を読み取り専用で確認。カウントは変更しない。
 * リクエスト開始前に呼び、超過なら拒否。
 */
export async function checkUsage(
  userId: string,
  mode: "free" | "premium",
): Promise<UsageCheckResult> {
  const dailyKey = getJSTDateString();

  // 当日レコードを確保（存在しなければ作成、カウントは変えない）
  const usage = await prisma.usageDaily.upsert({
    where: { userId_dailyKey: { userId, dailyKey } },
    update: {},
    create: { userId, dailyKey, freeCount: 0, premiumCount: 0 },
  });

  const limit =
    mode === "free" ? CONFIG.FREE_PER_DAY : CONFIG.PREMIUM_PER_DAY;
  const currentCount =
    mode === "free" ? usage.freeCount : usage.premiumCount;

  return {
    allowed: currentCount < limit,
    reason: currentCount >= limit ? "daily_limit_reached" : undefined,
    freeCount: usage.freeCount,
    premiumCount: usage.premiumCount,
    freeRemaining: Math.max(0, CONFIG.FREE_PER_DAY - usage.freeCount),
    premiumRemaining: Math.max(
      0,
      CONFIG.PREMIUM_PER_DAY - usage.premiumCount,
    ),
  };
}

/**
 * 日次カウントを+1する。
 * onFinish(生成成功)でのみ呼ぶ。失敗/中断時は呼ばない。
 */
export async function incrementUsage(
  userId: string,
  mode: "free" | "premium",
): Promise<void> {
  const dailyKey = getJSTDateString();

  if (mode === "free") {
    await prisma.usageDaily.upsert({
      where: { userId_dailyKey: { userId, dailyKey } },
      update: { freeCount: { increment: 1 } },
      create: { userId, dailyKey, freeCount: 1, premiumCount: 0 },
    });
  } else {
    await prisma.usageDaily.upsert({
      where: { userId_dailyKey: { userId, dailyKey } },
      update: { premiumCount: { increment: 1 } },
      create: { userId, dailyKey, freeCount: 0, premiumCount: 1 },
    });
  }
}

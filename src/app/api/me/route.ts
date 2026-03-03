import { NextRequest } from "next/server";
import { getOrCreateAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getJSTDateString } from "@/lib/cache";
import { CONFIG } from "@/lib/constants";
import type { MeResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    // ── 認証 + User/CreditWallet upsert（冪等） ──
    const user = await getOrCreateAuthUser(req);
    if (!user) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    // ── 並行取得: Subscription / CreditWallet / UsageDaily ──
    const dailyKey = getJSTDateString();

    const [subscription, wallet, usage] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: user.id },
      }),
      // credits を必ず数値で返す保証（auth.ts でも upsert 済みだが二重安全）
      prisma.creditWallet.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, credits: 0 },
      }),
      // 当日レコードを確保（なければ作成、カウントは増やさない）
      prisma.usageDaily.upsert({
        where: { userId_dailyKey: { userId: user.id, dailyKey } },
        update: {},
        create: { userId: user.id, dailyKey, freeCount: 0, premiumCount: 0 },
      }),
    ]);

    const plan: "free" | "premium" =
      subscription?.status === "active" ? "premium" : "free";

    const response: MeResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      plan,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          }
        : null,
      credits: wallet.credits,
      todayUsage: {
        dailyKey,
        freeCount: usage.freeCount,
        premiumCount: usage.premiumCount,
        freeRemaining: Math.max(0, CONFIG.FREE_PER_DAY - usage.freeCount),
        premiumRemaining: Math.max(
          0,
          CONFIG.PREMIUM_PER_DAY - usage.premiumCount,
        ),
      },
    };

    return Response.json(response);
  } catch (e) {
    console.error("[/api/me]", e);
    return Response.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}

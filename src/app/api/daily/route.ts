import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getJSTDateString } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { dailyOutputSchema } from "@/lib/ai/dailySchema";
import {
  buildDailySystemPrompt,
  buildDailyUserPrompt,
} from "@/lib/ai/dailyPrompts";
import { getModel, getModelId } from "@/lib/ai/provider";
import { CONFIG } from "@/lib/constants";
import { Prisma } from "@prisma/client";
import { ZODIAC_KEYS } from "@/lib/validators/fortuneInput";

// Vercel Hobby 上限60秒
export const maxDuration = 45;

const querySchema = z.object({
  zodiac: z.enum(ZODIAC_KEYS),
});

export async function GET(req: NextRequest) {
  // 1. IPベースのレート制限
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const withinLimit = await checkRateLimit(`daily:${ip}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 2. クエリパラメータのバリデーション
  const parsed = querySchema.safeParse({
    zodiac: req.nextUrl.searchParams.get("zodiac"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_zodiac", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { zodiac } = parsed.data;
  const dailyKey = getJSTDateString();

  // 3. キャッシュチェック（zodiacKey × JST日付）
  const cached = await prisma.dailyFortune.findUnique({
    where: { dailyKey_zodiacKey: { dailyKey, zodiacKey: zodiac } },
  });

  if (cached) {
    return NextResponse.json({
      output: cached.output,
      cached: true,
    });
  }

  // 4. AI生成
  try {
    const result = await generateObject({
      model: getModel(),
      schema: dailyOutputSchema,
      system: buildDailySystemPrompt(),
      prompt: buildDailyUserPrompt(zodiac, dailyKey),
      maxTokens: CONFIG.MAX_TOKENS_DAILY,
      temperature: CONFIG.TEMPERATURE,
    });

    // 5. DB保存（unique競合はcatch→再取得）
    try {
      await prisma.dailyFortune.create({
        data: {
          dailyKey,
          zodiacKey: zodiac,
          output: result.object as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err: unknown) {
      // unique制約違反 = 同時リクエストで先に保存された
      const isUniqueViolation =
        err !== null &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (isUniqueViolation) {
        const existing = await prisma.dailyFortune.findUnique({
          where: { dailyKey_zodiacKey: { dailyKey, zodiacKey: zodiac } },
        });
        if (existing) {
          return NextResponse.json({
            output: existing.output,
            cached: true,
          });
        }
      }
      throw err;
    }

    return NextResponse.json({
      output: result.object,
      cached: false,
    });
  } catch (err) {
    const isIncomplete =
      err instanceof Error &&
      "finishReason" in err &&
      (err as Record<string, unknown>).finishReason === "length";

    if (isIncomplete) {
      console.warn(
        "[/api/daily] AI generation incomplete (token limit reached)",
      );
      return NextResponse.json(
        { error: "generation_incomplete" },
        { status: 503 },
      );
    }

    console.error("[/api/daily] AI generation failed:", err);
    return NextResponse.json(
      { error: "generation_failed" },
      { status: 500 },
    );
  }
}

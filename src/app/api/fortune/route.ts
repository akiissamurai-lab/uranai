import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkUsage, incrementUsage } from "@/lib/usage";
import {
  computeInputHash,
  getJSTDateString,
  shouldBypassCache,
  findCachedResult,
} from "@/lib/cache";
import { fortuneInputSchema } from "@/lib/validators/fortuneInput";
import { fortuneOutputSchema } from "@/lib/ai/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { getModel, getModelId } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { CONFIG } from "@/lib/constants";
import { Prisma } from "@prisma/client";

// Vercel Hobby 上限60秒。バッファ15秒を確保
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  // 1. 認証
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. レート制限
  const withinLimit = await checkRateLimit(user.id);
  if (!withinLimit) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 3. リクエストボディのバリデーション
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = fortuneInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const mode = input.mode;

  // 4. 日次使用量チェック
  const usage = await checkUsage(user.id, mode);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "daily_limit_reached" },
      { status: 429 },
    );
  }

  // 5. キャッシュチェック（free のみ）
  const jstDate = getJSTDateString();
  const inputHash = computeInputHash(
    {
      birthdate: input.birthdate,
      zodiac: input.zodiac,
      animal: input.animal,
      category: input.category,
      freeText: input.freeText,
    },
    jstDate,
  );

  if (!shouldBypassCache(mode)) {
    const cached = await findCachedResult(inputHash);
    if (cached) {
      await incrementUsage(user.id, mode);
      return NextResponse.json({
        id: cached.id,
        output: cached.outputJson,
        cached: true,
      });
    }
  }

  // 6. FortuneRequest を pending で作成
  const fortune = await prisma.fortuneRequest.create({
    data: {
      userId: user.id,
      inputHash,
      inputJson: input as unknown as Prisma.InputJsonValue,
      mode,
      status: "pending",
    },
  });

  // 7. AI 生成
  try {
    const maxTokens =
      mode === "premium"
        ? CONFIG.MAX_TOKENS_PREMIUM
        : CONFIG.MAX_TOKENS_FREE;

    const result = await generateObject({
      model: getModel(),
      schema: fortuneOutputSchema,
      system: buildSystemPrompt(mode),
      prompt: buildUserPrompt({ ...input, date: jstDate }),
      maxTokens,
      temperature: CONFIG.TEMPERATURE,
    });

    // 8. DB に保存
    await prisma.fortuneRequest.update({
      where: { id: fortune.id },
      data: {
        outputJson: result.object as unknown as Prisma.InputJsonValue,
        modelMeta: {
          model: getModelId(),
          usage: result.usage,
        } as unknown as Prisma.InputJsonValue,
        status: "completed",
      },
    });

    // 9. 日次カウント +1
    await incrementUsage(user.id, mode);

    return NextResponse.json({
      id: fortune.id,
      output: result.object,
      cached: false,
    });
  } catch (err) {
    // 生成失敗 → status を failed に（回数は消費しない）
    await prisma.fortuneRequest.update({
      where: { id: fortune.id },
      data: { status: "failed" },
    });

    // finishReason='length' → トークン上限で途中切断
    const isIncomplete =
      err instanceof Error &&
      "finishReason" in err &&
      (err as Record<string, unknown>).finishReason === "length";

    if (isIncomplete) {
      console.warn(
        "[/api/fortune] AI generation incomplete (token limit reached)",
      );
      return NextResponse.json(
        { error: "generation_incomplete" },
        { status: 503 },
      );
    }

    console.error("[/api/fortune] AI generation failed:", err);

    return NextResponse.json(
      { error: "generation_failed" },
      { status: 500 },
    );
  }
}

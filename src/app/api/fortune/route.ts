import { NextRequest, NextResponse } from "next/server";
import { streamObject } from "ai";
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
import { detectCrisis } from "@/lib/safety/crisis";
import { CRISIS_RESPONSE } from "@/lib/safety/crisisResponse";
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

  // 3.5. 危機キーワード検知（LLM 呼び出し前・回数消費前にブロック）
  if (detectCrisis(input.freeText ?? "")) {
    console.log("[/api/fortune] crisis detected — returning safe response");
    return NextResponse.json({
      id: "crisis",
      output: CRISIS_RESPONSE,
      cached: false,
    });
  }

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

  // 7. AI ストリーミング生成
  const maxTokens =
    mode === "premium" ? CONFIG.MAX_TOKENS_PREMIUM : CONFIG.MAX_TOKENS_FREE;

  const result = streamObject({
    model: getModel(),
    schema: fortuneOutputSchema,
    system: buildSystemPrompt(mode),
    prompt: buildUserPrompt({ ...input, date: jstDate }),
    maxTokens,
    temperature: CONFIG.TEMPERATURE,
    onFinish: async ({ object, usage: tokenUsage }) => {
      // 8. ストリーム完了後に DB 保存 + 回数カウント
      try {
        await prisma.fortuneRequest.update({
          where: { id: fortune.id },
          data: {
            outputJson: object as unknown as Prisma.InputJsonValue,
            modelMeta: {
              model: getModelId(),
              usage: tokenUsage,
            } as unknown as Prisma.InputJsonValue,
            status: "completed",
          },
        });
        await incrementUsage(user.id, mode);
      } catch (err) {
        console.error("[/api/fortune] DB save after stream failed:", err);
        await prisma.fortuneRequest
          .update({
            where: { id: fortune.id },
            data: { status: "failed" },
          })
          .catch(() => {});
      }
    },
  });

  // カスタム SSE ストリーム: partial → done/error
  const encoder = new TextEncoder();
  let lastSent = 0;
  const THROTTLE_MS = 120;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const partial of result.partialObjectStream) {
          const now = Date.now();
          if (now - lastSent >= THROTTLE_MS) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(partial)}\n\n`),
            );
            lastSent = now;
          }
        }

        // 最後のパーシャルが送信されていない場合のため、完了オブジェクトを送信
        const finalObject = await result.object;
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              id: fortune.id,
              output: finalObject,
              cached: false,
            })}\n\n`,
          ),
        );
      } catch (err) {
        const isIncomplete =
          err instanceof Error &&
          "finishReason" in err &&
          (err as Record<string, unknown>).finishReason === "length";

        const errorKey = isIncomplete
          ? "generation_incomplete"
          : "generation_failed";

        console.error(`[/api/fortune] stream error (${errorKey}):`, err);

        // DB を failed に更新
        await prisma.fortuneRequest
          .update({
            where: { id: fortune.id },
            data: { status: "failed" },
          })
          .catch(() => {});

        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: errorKey })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Fortune-Id": fortune.id,
    },
  });
}

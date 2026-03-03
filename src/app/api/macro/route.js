import { getRatelimit, getIP, getDailyMacroLimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase-server";
import { AI } from "@/lib/constants";
import { lookupCache, storeCache } from "@/lib/pfc-cache";
import { validateOrigin, safeApiError } from "@/lib/api-guard";

// ── サーバー側プロンプト（クライアントには公開しない）─────────────
const SYSTEM_PROMPT = `あなたは栄養管理専門のAIアシスタントです。
食品の栄養素（カロリー、タンパク質、脂質、炭水化物）、価格、レシピ、食事プランに関する質問にのみ回答してください。
栄養・食事・健康に無関係な質問には一切回答せず、「食事に関する質問のみお答えできます」とだけ返してください。
必ずJSON形式のみで回答してください。前後に説明文を付けないでください。`;

function buildPfcPrompt(foodQuery) {
  return `以下の食品・料理の1食分の標準的な栄養素を推定してください。JSON形式のみで回答してください。他のテキストは一切不要です。

食品名: ${foodQuery}

回答形式（厳守）:
{"p":数値,"f":数値,"c":数値,"cal":数値,"price":数値,"serving":"量の説明"}

p=たんぱく質(g), f=脂質(g), c=炭水化物(g), cal=カロリー(kcal), price=目安価格(円), serving=1食分の量の説明（例: "1膳150g", "1個60g"）`;
}

export async function POST(request) {
  // ── CSRF / Origin 検証 ─────────────────────────────────────────
  const originCheck = validateOrigin(request);
  if (!originCheck.valid) return originCheck.response;

  // ── Rate Limit（バースト保護 — 最優先で判定）────────────────────
  const limiter = getRatelimit();
  let rateLimitPassed = false;
  if (limiter) {
    try {
      const ip = getIP(request);
      const { success, limit, remaining, reset } = await limiter.limit(ip);
      rateLimitPassed = true;

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return Response.json(
          {
            error: "リクエスト制限に達しました。しばらく待ってから再度お試しください。",
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": String(remaining),
            },
          }
        );
      }
    } catch (e) {
      // Redis 接続エラー: 認証ユーザーは続行、ゲストは拒否（コスト保護）
      console.error("Rate limit check failed:", e.message);
    }
  }

  // ── ユーザー認証（ゲストも許可 — ただし Rate Limit 必須）────────
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // Supabase クライアント生成失敗時はゲスト扱い
  }

  // ゲストかつ Rate Limit が機能していない場合 → 拒否（コスト保護）
  if (!user && !rateLimitPassed) {
    return Response.json(
      { error: "一時的にサービスを利用できません。しばらく待ってから再度お試しください。" },
      { status: 503 }
    );
  }

  // ── APIキー確認 ──────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "ここにAPIキーを入力") {
    console.error("ANTHROPIC_API_KEY is missing or placeholder");
    return Response.json(
      { error: "AI機能が一時的に利用できません。管理者にお問い合わせください。" },
      { status: 503 }
    );
  }

  // ── リクエストボディ検証 ─────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "不正なリクエスト形式です" }, { status: 400 });
  }

  const { foodQuery } = body;

  // foodQuery のみ受け付ける（クライアントからの任意 prompt は廃止 — プロンプトインジェクション対策）
  if (!foodQuery || typeof foodQuery !== "string" || !foodQuery.trim()) {
    return Response.json({ error: "foodQuery（文字列）が必要です" }, { status: 400 });
  }

  const sanitizedQuery = foodQuery.trim().slice(0, 200);
  const userPrompt = buildPfcPrompt(sanitizedQuery);

  // ── PFC キャッシュ検索（foodQuery がある場合のみ）──────────────
  // キャッシュヒット = AI コストゼロ → 日次リミットを消費しない
  if (foodQuery && typeof foodQuery === "string") {
    const cached = await lookupCache(foodQuery);
    if (cached) {
      const cacheResponse = {
        p: Number(cached.protein),
        f: Number(cached.fat),
        c: Number(cached.carbs),
        cal: Number(cached.calories),
        price: Number(cached.price),
        serving: cached.serving || "",
      };
      return Response.json({
        content: [{ type: "text", text: JSON.stringify(cacheResponse) }],
        _cached: true,
      });
    }
  }

  // ── 日次ハードリミット（10回/日 — ユーザー単位）────────────────
  // キャッシュミスの場合のみここに到達（= 実際に AI API を叩く）
  const identifier = user?.id || getIP(request);
  let dailyRemaining = null;
  const dailyLimiter = getDailyMacroLimit();
  if (dailyLimiter) {
    try {
      const { success, limit, remaining, reset } = await dailyLimiter.limit(identifier);
      dailyRemaining = remaining;

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return Response.json(
          {
            error: "本日のAI推測回数の上限（10回）に達しました。明日またお試しください 🌙",
            retryAfter,
            limitType: "daily",
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Type": "daily",
            },
          }
        );
      }
    } catch (e) {
      console.error("Daily limit check failed:", e.message);
    }
  }

  // ── Anthropic API 呼び出し（Haiku — タイムアウト付き）──────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": AI.API_VERSION,
      },
      body: JSON.stringify({
        model: AI.MACRO_MODEL,
        max_tokens: AI.MACRO_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(AI.TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return safeApiError(res.status, errBody, "Macro API");
    }

    const data = await res.json();

    // ── キャッシュ保存（food estimation のみ — fire-and-forget）───
    if (foodQuery && typeof foodQuery === "string") {
      try {
        const raw = data.content?.map((b) => b.text || "").join("") || "";
        const jsonMatch = raw.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          storeCache(foodQuery, parsed, AI.MACRO_MODEL).catch(() => {});
        }
      } catch {
        // キャッシュ保存失敗は無視（レスポンスに影響しない）
      }
    }

    return Response.json(data, {
      headers: {
        ...(dailyRemaining != null && {
          "X-RateLimit-Remaining": String(dailyRemaining),
          "X-RateLimit-Type": "daily",
        }),
      },
    });
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      console.error("Anthropic API timeout:", e.message);
      return Response.json(
        { error: "AI APIがタイムアウトしました。しばらく待ってから再度お試しください。" },
        { status: 504 }
      );
    }
    console.error("Macro API error:", e);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

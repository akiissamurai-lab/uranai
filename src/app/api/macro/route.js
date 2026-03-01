import { getRatelimit, getIP } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase-server";
import { AI } from "@/lib/constants";

export async function POST(request) {
  // ── Rate Limit（最優先で判定）────────────────────────────────
  const limiter = getRatelimit();
  if (limiter) {
    try {
      const ip = getIP(request);
      const { success, limit, remaining, reset } = await limiter.limit(ip);

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
      // Redis 接続エラーでもサービスは止めない（フォールスルー）
      console.error("Rate limit check failed:", e.message);
    }
  }

  // ── ユーザー認証（ゲストも許可 — Rate Limitで保護）──────────────
  // 認証済みユーザーは識別・追跡可能。未認証は IP ベースの Rate Limit に依存。
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    // Supabase クライアント生成失敗時はゲスト扱いで続行
  }

  // ── APIキー確認 ──────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "ここにAPIキーを入力") {
    console.error("ANTHROPIC_API_KEY is missing or placeholder");
    return Response.json(
      { error: "ANTHROPIC_API_KEY が未設定です。Vercel の Settings → Environment Variables を確認してください。" },
      { status: 500 }
    );
  }

  // ── リクエストボディ検証 ─────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "不正なリクエスト形式です" }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt（文字列）が必要です" }, { status: 400 });
  }

  if (prompt.length > AI.MAX_PROMPT_LENGTH) {
    return Response.json(
      { error: `prompt が長すぎます（上限 ${AI.MAX_PROMPT_LENGTH} 文字）` },
      { status: 400 }
    );
  }

  // ── Anthropic API 呼び出し（タイムアウト付き）─────────────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": AI.API_VERSION,
      },
      body: JSON.stringify({
        model: AI.MODEL,
        max_tokens: AI.MACRO_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(AI.TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Anthropic API error ${res.status}:`, errBody);
      let detail = "";
      try {
        const parsed = JSON.parse(errBody);
        detail = parsed.error?.message || errBody;
      } catch {
        detail = errBody;
      }
      return Response.json(
        { error: `Anthropic API error (${res.status}): ${detail}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return Response.json(data);
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

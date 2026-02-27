import { getRatelimit, getIP } from "@/lib/ratelimit";

// プロンプトの最大文字数（安全マージン込み）
const MAX_PROMPT_LENGTH = 5000;

export async function POST(request) {
  // ── Rate Limit（最優先で判定）────────────────────────────────
  // getRatelimit() は環境変数未設定なら null を返す（フォールスルー）
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

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return Response.json(
      { error: `prompt が長すぎます（上限 ${MAX_PROMPT_LENGTH} 文字）` },
      { status: 400 }
    );
  }

  // ── Anthropic API 呼び出し ──────────────────────────────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Anthropic API error ${res.status}:`, errBody);
      // Anthropic のエラー詳細をクライアントに返す
      let detail = "";
      try {
        const parsed = JSON.parse(errBody);
        detail = parsed.error?.message || errBody;
      } catch {
        detail = errBody;
      }
      return Response.json(
        { error: `Anthropic API error (${res.status}): ${detail}` },
        { status: 502 }   // 外部APIエラーは 502 で返す（Anthropic の status をそのまま返さない）
      );
    }

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

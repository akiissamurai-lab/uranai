import { getRatelimit, getIP } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase-server";

export async function POST(request) {
  // ── Rate Limit ──────────────────────────────────────────────
  const limiter = getRatelimit();
  if (limiter) {
    try {
      const ip = getIP(request);
      const { success, limit, remaining, reset } = await limiter.limit(ip);
      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        return Response.json(
          { error: "リクエスト制限に達しました。しばらく待ってから再度お試しください。", retryAfter },
          { status: 429, headers: { "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(limit), "X-RateLimit-Remaining": String(remaining) } }
        );
      }
    } catch (e) {
      console.error("Rate limit check failed:", e.message);
    }
  }

  // ── APIキー確認 ──────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "ここにAPIキーを入力") {
    return Response.json({ error: "ANTHROPIC_API_KEY が未設定です" }, { status: 500 });
  }

  // ── ユーザー認証 ─────────────────────────────────────────────
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    console.error("Supabase client creation failed:", e.message);
    return Response.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "認証が必要です。ログインしてください。" }, { status: 401 });
  }

  // ── データ取得 ───────────────────────────────────────────────
  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (!profile.protein_goal && !profile.budget)) {
    return Response.json({ error: "プロフィールで目標（PFC/予算）を設定してください。" }, { status: 400 });
  }

  // Body metrics (14 days)
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: metrics } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", sinceStr)
    .order("date", { ascending: true });

  if (!metrics || metrics.length === 0) {
    return Response.json({ error: "体重データがありません。「推移」ページで体重を記録してください。" }, { status: 400 });
  }

  // Routine meals
  const { data: routines } = await supabase
    .from("routine_meals")
    .select("meal_name, price, protein, fat, carbs")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  // ── プロンプト構築 ──────────────────────────────────────────
  const metricsStr = metrics.map((m) =>
    `${m.date}: ${m.weight}kg${m.body_fat ? ` / 体脂肪${m.body_fat}%` : ""}${m.notes ? ` (メモ: ${m.notes})` : ""}`
  ).join("\n");

  const routinesStr = routines && routines.length > 0
    ? routines.map((r) => `- ${r.meal_name}: ¥${r.price || "?"} P${r.protein || "?"}g F${r.fat || "?"}g C${r.carbs || "?"}g`).join("\n")
    : "（未登録）";

  const prompt = `あなたはプロのボディメイクトレーナー兼、節約アドバイザーです。
以下のユーザーデータを分析し、進捗判定・PFC調整・買い物リストを生成してください。

【ユーザー情報】
- 性別: ${profile.gender || "不明"}
- 現在の体重: ${profile.weight || "不明"}kg
- 目標体重: ${profile.goal_weight || "不明"}kg
- 目的: ${profile.goal || "不明"}
- 活動レベル: ${profile.activity || "不明"}
- 1日の食費予算: ¥${profile.budget || "不明"}

【現在のPFC目標（1日）】
- タンパク質: ${profile.protein_goal || "未設定"}g
- 脂質: ${profile.fat_goal || "未設定"}g
- 炭水化物: ${profile.carbs_goal || "未設定"}g

【直近14日間の体重推移】
${metricsStr}

【登録済みルーティン飯】
${routinesStr}

【指示】
1. 体重推移から「順調」「停滞気味」「要注意」のいずれかを判定
2. 停滞or要注意の場合、予算内でPFCを微調整した新目標を提示
3. 順調でも改善の余地があれば軽微な調整を提案
4. 業務スーパー・ドラッグストアなどで安く買える食材中心の「今週の買い物リスト」（7日分）を生成
5. 合計金額は1日予算×7以内に収める

必ず以下のJSON形式のみで回答してください。JSON以外のテキストは不要です:
{
  "status": "順調" or "停滞気味" or "要注意",
  "statusEmoji": "🟢" or "🟡" or "🔴",
  "summary": "2-3文の分析サマリー",
  "weightTrend": { "direction": "down" or "flat" or "up", "weeklyChange": 数値(kg) },
  "newMacros": { "protein": 数値, "fat": 数値, "carbs": 数値, "budget": 数値 },
  "macroReason": "変更理由の1文",
  "groceryList": [
    { "item": "食材名", "amount": "数量", "estPrice": 数値(円), "note": "購入先やメモ" }
  ],
  "weeklyTotal": 数値(円),
  "advice": "具体的な行動アドバイス2-3文",
  "mealTip": "おすすめの食事タイミング・組み合わせ1文"
}`;

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
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Anthropic API error ${res.status}:`, errBody);
      let detail = "";
      try { detail = JSON.parse(errBody).error?.message || errBody; } catch { detail = errBody; }
      return Response.json({ error: `AI API エラー (${res.status}): ${detail}` }, { status: 502 });
    }

    const data = await res.json();

    // JSON抽出 & パース
    const raw = data.content?.map((b) => b.text || "").join("") || "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return Response.json({ error: "AIの応答を解析できませんでした" }, { status: 502 });
    }

    const cleaned = raw.slice(start, end + 1)
      .replace(/[\x00-\x1F]/g, " ")
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]");

    const result = JSON.parse(cleaned);
    return Response.json({ result });
  } catch (e) {
    console.error("AI Coach error:", e);
    return Response.json({ error: "AIコーチの分析中にエラーが発生しました" }, { status: 500 });
  }
}

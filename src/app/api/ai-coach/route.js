import { getRatelimit, getIP, getWeeklyCoachLimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase-server";
import { AI } from "@/lib/constants";

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

  // ── 週次ハードリミット（2回/週 — ユーザー単位）────────────────
  let weeklyRemaining = null;
  const weeklyLimiter = getWeeklyCoachLimit();
  if (weeklyLimiter) {
    try {
      const { success, limit, remaining, reset } = await weeklyLimiter.limit(user.id);
      weeklyRemaining = remaining;

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        const retryDays = Math.ceil(retryAfter / 86400);
        return Response.json(
          {
            error: `AIコーチの週間利用回数の上限（2回）に達しました。${retryDays}日後に再度ご利用いただけます 📅`,
            retryAfter,
            limitType: "weekly",
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Type": "weekly",
            },
          }
        );
      }
    } catch (e) {
      console.error("Weekly limit check failed:", e.message);
    }
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

  // Meal logs & Training logs (直近7日間)
  const mealSince = new Date();
  mealSince.setDate(mealSince.getDate() - 7);
  const mealSinceStr = mealSince.toISOString().slice(0, 10);

  // Training logs (直近7日間)
  const { data: trainingLogs } = await supabase
    .from("training_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", mealSinceStr)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: mealLogs } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", mealSinceStr)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  // ── プロンプト構築 ──────────────────────────────────────────
  const metricsStr = metrics.map((m) => {
    let line = `${m.date}: `;
    if (m.weight != null) line += `朝${m.weight}kg`;
    if (m.weight_night != null) line += `→夜${m.weight_night}kg`;
    if (!m.weight && !m.weight_night) line += "体重未記録";
    if (m.body_fat != null) line += ` / 体脂肪${m.body_fat}%`;
    if (m.body_fat_night != null) line += `(夜${m.body_fat_night}%)`;
    if (m.notes) line += ` (メモ: ${m.notes})`;
    return line;
  }).join("\n");

  const routinesStr = routines && routines.length > 0
    ? routines.map((r) => `- ${r.meal_name}: ¥${r.price || "?"} P${r.protein || "?"}g F${r.fat || "?"}g C${r.carbs || "?"}g`).join("\n")
    : "（未登録）";

  // 食事ログを日別にグループ化 + 日別合計算出
  let mealLogsStr = "（記録なし）";
  if (mealLogs && mealLogs.length > 0) {
    const grouped = {};
    for (const log of mealLogs) {
      if (!grouped[log.date]) grouped[log.date] = [];
      grouped[log.date].push(log);
    }
    mealLogsStr = Object.entries(grouped).map(([d, logs]) => {
      const dayP = logs.reduce((s, l) => s + (l.protein || 0), 0);
      const dayF = logs.reduce((s, l) => s + (l.fat || 0), 0);
      const dayC = logs.reduce((s, l) => s + (l.carbs || 0), 0);
      const dayCost = logs.reduce((s, l) => s + (l.price || 0), 0);
      const dayCal = Math.round(dayP * 4 + dayF * 9 + dayC * 4);
      const items = logs.map((l) => `  - ${l.meal_index ? `[${l.meal_index}食目] ` : ""}${l.meal_name}${l.price ? ` ¥${l.price}` : ""} P${l.protein || 0}g F${l.fat || 0}g C${l.carbs || 0}g`).join("\n");
      return `${d} [合計: ${dayCal}kcal P${Math.round(dayP)}g F${Math.round(dayF)}g C${Math.round(dayC)}g ¥${dayCost}]\n${items}`;
    }).join("\n");
  }

  // トレーニングログフォーマット
  const bodyPartLabels = { chest: "胸", back: "背中", shoulders: "肩", arms: "腕", legs: "脚", abs: "腹", cardio: "有酸素" };
  let trainingLogsStr = "（記録なし）";
  if (trainingLogs && trainingLogs.length > 0) {
    trainingLogsStr = trainingLogs.map((tl) => {
      const parts = (tl.body_parts || []).map((p) => bodyPartLabels[p] || p).join("・");
      let line = `${tl.date}: ${parts} 強度${tl.intensity || "?"}/5`;
      if (tl.duration_minutes) line += ` ${tl.duration_minutes}分`;
      if (tl.notes) line += `\n  → ${tl.notes}`;
      return line;
    }).join("\n");
  }

  const month = new Date().getMonth() + 1;
  const season = month >= 3 && month <= 5 ? "春" : month >= 6 && month <= 8 ? "夏" : month >= 9 && month <= 11 ? "秋" : "冬";
  const weeklyBudget = profile.budget ? Number(profile.budget) * 7 : null;

  const prompt = `あなたはプロのボディメイクトレーナー兼、節約アドバイザーです。
以下のユーザーデータを分析し、進捗判定・PFC調整・買い物リストを生成してください。

【安全ガード — 最優先ルール】
- 1日の総摂取カロリーが1200kcal未満になる提案は絶対に行わないこと（男性は1500kcal未満）
- newMacrosのprotein/fat/carbsから算出されるカロリー(P*4+F*9+C*4)が上記下限を下回る場合、自動的に下限まで引き上げること
- 極端な単一栄養素制限（脂質10g未満、炭水化物30g未満等）は推奨しないこと
- BMI 18.5未満への減量目標が推測される場合、statusを「要注意」とし、医師への相談を促すこと
- 1週間あたり1kg以上の急激な減量ペースを推奨しないこと（0.5〜0.7kg/週を上限目安）
- ユーザーの実際の摂取記録が3日以上連続で1000kcal未満の場合、summaryで警告を発すること

【出力トーンルール — 厳守】
- 絵文字は一切使用しないこと
- 過度に熱量の高い表現を避けること（「素晴らしい！」「頑張りましょう！」「最高です！」等は禁止）
- 一流コンサルタント・アナリストのように冷静・客観的・端的なトーンで出力すること
- 箇条書きを積極的に活用し、視認性を高めること
- 事実ベースで淡々と分析・提案すること（感情的な表現は不要）

【価格基準 — 日本の業務スーパー・ディスカウントストア相場（税込目安）】
- 鶏むね肉: 100gあたり約60〜80円（2kg約900〜1,300円）
- 鶏もも肉: 100gあたり約80〜100円
- 豚こま切れ肉: 100gあたり約90〜120円
- 卵1パック(10個): 約200〜280円
- 木綿豆腐(1丁300g): 約30〜50円
- 納豆(3パック): 約70〜100円
- ツナ缶(水煮70g): 1缶約100〜130円
- 鯖缶(水煮190g): 1缶約150〜200円
- 牛乳(1L): 約170〜220円
- ヨーグルト(400g): 約120〜160円
- 白米(5kg): 約1,800〜2,500円（1食150g炊飯後≒約25〜35円）
- オートミール(500g): 約300〜500円（1食40g≒約25〜40円）
- 食パン(6枚切): 約100〜150円
- パスタ(500g): 約100〜180円
- もやし(1袋200g): 約20〜40円
- キャベツ(1玉): 約100〜200円
- ブロッコリー(冷凍500g): 約150〜250円
- バナナ(1房4-5本): 約100〜150円
- プロテインパウダー(1kg): 約2,500〜4,000円（1杯30g≒約75〜120円）
- 調味料セット(醤油・味噌・油等): 週あたり約200〜400円を加算

【価格ルール — 厳守事項】
1. 上記の相場を基準に計算し、非現実的な安さ(例: 鶏むね肉2kg=500円)にしないこと
2. 金額は「約〜円（目安）」で算出し、「〜円です」と断定しないこと（地域・季節で変動）
3. 買い物リストの各品目のestPriceは上記相場の範囲内で設定すること
4. weeklyTotalは各品目のestPriceの合計と一致させること（セルフチェック必須）
5. weeklyTotalは必ず週間予算(¥${weeklyBudget || "未設定"})以内に収めること
6. 予算が厳しい場合は品数を減らし、高コスパ食材（鶏むね・卵・豆腐・納豆・もやし）を優先
7. 調味料・油のコスト（週約200〜400円）を必ず買い物リストに含めること
8. ${season}（${month}月）の旬食材があれば優先して安く提案

【ユーザー情報】
- 性別: ${profile.gender === "male" ? "男性" : profile.gender === "female" ? "女性" : "不明"}
- 年齢: ${profile.age || "不明"}歳
- 現在の体重: ${profile.weight || "不明"}kg
- 目標体重: ${profile.goal_weight || "不明"}kg
- 目標体脂肪率: ${profile.goal_body_fat || "未設定"}%
- 目的: ${profile.goal || "不明"}
- 活動レベル: ${profile.activity || "不明"}
- 1日の食費予算: ¥${profile.budget || "不明"}
- 週間予算上限: ¥${weeklyBudget || "不明"}
- 現在: ${month}月（${season}）

【現在のPFC目標（1日）】
- タンパク質: ${profile.protein_goal || "未設定"}g
- 脂質: ${profile.fat_goal || "未設定"}g
- 炭水化物: ${profile.carbs_goal || "未設定"}g

【直近14日間の体重推移（朝→夜）】
${metricsStr}

【登録済みルーティン飯】
${routinesStr}

【直近7日間の実際の食事記録】
${mealLogsStr}

【直近7日間のトレーニング記録】
${trainingLogsStr}

【トレーニングデータの活用 — 厳守】
- トレーニング記録がある場合、強度・部位・メモの内容に基づいてマクロ栄養素のアジャストを提案すること
- 脚トレなど大筋群の高強度トレーニング翌日: 筋グリコーゲン補充のため炭水化物+20〜30gの微増を推奨
- 高強度トレーニング翌日の体重増加: 筋グリコーゲン + 水分貯留によるものと判断し、脂肪増加と混同しないこと
- トレーニング日: タンパク質摂取タイミング（トレ後30分以内に20〜30g）を推奨
- 連日高強度の場合: オーバートレーニングリスクに言及し、休息日とカロリー維持を推奨
- 有酸素運動日: 過度なカロリー制限を避け、脂質を適度に維持するよう助言
- トレーニング記録がない日が続く場合: 活動量低下を考慮したカロリー調整を提案
- trainingAnalysisフィールドでトレーニング内容を分析根拠として明示的に引用すること

【体調メモの活用 — 厳守】
- 体調メモ（体重推移欄に記載）は体重変動の「原因」を推定するための定性データとして扱う
- 飲み会・外食の記載: 一時的な水分貯留・塩分過多の可能性を指摘し、翌日以降の回復プランを提示すること（非judgmental・責めない）
- 筋肉痛・トレーニングの記載: 筋修復を優先し、タンパク質維持または微増を推奨。過度なカロリー制限を避けるよう助言
- 睡眠不足・疲労の記載: コルチゾール上昇による水分貯留・食欲増進のメカニズムに触れ、回復優先を推奨
- 体調不良の記載: 減量ペースの一時緩和を推奨し、無理をさせない
- メモがない日は数値のみで判断（メモの有無で分析精度が変わることをユーザーに示唆しない）
- summaryフィールドでメモ内容を分析根拠として明示的に引用すること

【指示】
1. 体重推移と体調メモの両方を考慮し「順調」「停滞気味」「要注意」のいずれかを判定
2. 停滞or要注意の場合、予算内でPFCを微調整した新目標を提示
3. 順調でも改善の余地があれば軽微な調整を提案
4. 業務スーパー・ドラッグストア・ドンキホーテで安く買える食材中心の「今週の買い物リスト」（7日分）を生成
5. 合計金額は週間予算(¥${weeklyBudget || "不明"})以内に厳密に収める
6. 各食材のestPriceは上記の価格基準に準拠すること
7. 買い物リストの最後に「調味料・油セット」を必ず含めること
8. 実際の食事記録がある場合、目標PFCとの乖離を日別に分析し、具体的な改善点を提示すること

必ず以下のJSON形式のみで回答してください。JSON以外のテキストは不要です:
{
  "status": "順調" or "停滞気味" or "要注意",
  "summary": "2-3文の分析サマリー（体調メモがあれば分析根拠として引用）",
  "weightTrend": { "direction": "down" or "flat" or "up", "weeklyChange": 数値(kg) },
  "conditionContext": "体調メモに基づく補足分析（メモがない場合は空文字）",
  "trainingAnalysis": "トレーニング記録に基づく栄養アジャスト提案（記録がない場合は空文字）",
  "mealAnalysis": "実際の食事記録に基づくPFC乖離分析と改善点（記録がない場合は空文字）",
  "newMacros": { "protein": 数値, "fat": 数値, "carbs": 数値, "budget": 数値 },
  "macroReason": "変更理由の1文",
  "groceryList": [
    { "item": "食材名", "amount": "数量", "estPrice": 数値(円・目安), "note": "購入先の目安(例:業務スーパー)" }
  ],
  "weeklyTotal": 数値(円・各estPriceの合計と一致させること),
  "budgetCheck": "週間予算¥${weeklyBudget || "?"}に対して¥○○（○%）で収まっています",
  "advice": "具体的な行動アドバイス2-3文（買い物のコツ含む）",
  "mealTip": "おすすめの食事タイミング・組み合わせ1文"
}`;

  // ── Anthropic API 呼び出し（タイムアウト付き）──────────────────
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": AI.API_VERSION,
      },
      body: JSON.stringify({
        model: AI.COACH_MODEL,
        max_tokens: AI.COACH_MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(AI.TIMEOUT_MS),
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
    return Response.json(
      { result },
      {
        headers: {
          ...(weeklyRemaining != null && {
            "X-RateLimit-Remaining": String(weeklyRemaining),
            "X-RateLimit-Type": "weekly",
          }),
        },
      }
    );
  } catch (e) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      console.error("AI Coach API timeout:", e.message);
      return Response.json(
        { error: "AI APIがタイムアウトしました。しばらく待ってから再度お試しください。" },
        { status: 504 }
      );
    }
    console.error("AI Coach error:", e);
    return Response.json({ error: "AIコーチの分析中にエラーが発生しました" }, { status: 500 });
  }
}

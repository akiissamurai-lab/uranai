import { createClient } from "@/lib/supabase-server";

/**
 * PFC推測レスポンスキャッシュ（Supabase pfc_cache テーブル）
 *
 * 同じ食品名のリクエストを AI に送らず DB から返すことで
 * API コストを大幅に削減する。
 */

/** 食品名をキャッシュキーとして正規化（trim + collapse spaces + lowercase） */
function normalizeFoodName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * キャッシュから PFC データを検索する。
 * @returns {{ protein, fat, carbs, calories, price, serving } | null}
 */
export async function lookupCache(foodName) {
  try {
    const supabase = await createClient();
    const normalized = normalizeFoodName(foodName);

    const { data, error } = await supabase
      .from("pfc_cache")
      .select("protein, fat, carbs, calories, price, serving")
      .eq("food_name", normalized)
      .single();

    if (error || !data) return null;
    return data;
  } catch (e) {
    // キャッシュ障害でサービスを止めない（フォールスルー）
    console.warn("PFC cache lookup failed:", e.message);
    return null;
  }
}

/**
 * AI 推測結果をキャッシュに保存する（upsert — 重複時は上書き）。
 * fire-and-forget で呼ばれるため、失敗してもレスポンスに影響しない。
 */
export async function storeCache(foodName, data, model) {
  try {
    const supabase = await createClient();
    const normalized = normalizeFoodName(foodName);

    await supabase.from("pfc_cache").upsert(
      {
        food_name: normalized,
        protein: data.p ?? data.protein ?? null,
        fat: data.f ?? data.fat ?? null,
        carbs: data.c ?? data.carbs ?? null,
        calories: data.cal ?? data.calories ?? null,
        price: data.price ?? null,
        serving: data.serving ?? null,
        model,
      },
      { onConflict: "food_name" }
    );
  } catch (e) {
    console.warn("PFC cache store failed:", e.message);
  }
}

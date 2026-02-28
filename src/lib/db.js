// DB ヘルパー関数 — Supabase CRUD

export async function loadProfile(supabase, userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("loadProfile error:", error.message);
    return null;
  }
  return data;
}

export async function saveProfile(supabase, userId, data) {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        weight: data.weight || null,
        height: data.height || null,
        age: data.age || null,
        body_fat: data.bodyFat || null,
        gender: data.gender || null,
        goal: data.goal || null,
        activity: data.activity || null,
        goal_weight: data.goalWeight || null,
        budget: data.budget || null,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.warn("saveProfile error:", error.message);
  }
}

export async function saveMealPlan(supabase, userId, plan) {
  const { error } = await supabase.from("meal_plans").insert({
    user_id: userId,
    budget: plan.budget,
    protein_target: plan.proteinTarget,
    calorie_target: plan.calorieTarget,
    total_protein: plan.totalProtein,
    total_fat: plan.totalFat,
    total_carbs: plan.totalCarbs,
    total_cal: plan.totalCal,
    total_cost: plan.totalCost,
    items: plan.items,
    ai_advice: plan.aiAdvice || null,
  });

  if (error) {
    console.warn("saveMealPlan error:", error.message);
  }
}

export async function loadMealPlans(supabase, userId, limit = 10) {
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("loadMealPlans error:", error.message);
    return [];
  }
  return data;
}

export async function deleteMealPlan(supabase, userId, planId) {
  const { error } = await supabase
    .from("meal_plans")
    .delete()
    .eq("id", planId)
    .eq("user_id", userId);

  if (error) {
    console.warn("deleteMealPlan error:", error.message);
  }
}

// localStorage → DB 移行（初回ログイン時に1回だけ）
export async function migrateFromLocalStorage(supabase, userId) {
  const migrated = localStorage.getItem(`migrated_${userId}`);
  if (migrated) return;

  try {
    const raw = localStorage.getItem("macro_history");
    if (!raw) return;

    const history = JSON.parse(raw);
    if (!Array.isArray(history) || history.length === 0) return;

    // localStorage の履歴を DB に保存
    for (const entry of history) {
      await supabase.from("meal_plans").insert({
        user_id: userId,
        budget: entry.budget,
        protein_target: entry.proteinTarget,
        calorie_target: entry.calorieTarget,
        total_protein: entry.totalProtein,
        total_fat: entry.totalFat,
        total_carbs: entry.totalCarbs,
        total_cal: entry.totalCal,
        total_cost: entry.totalCost,
        items: entry.items || [],
        ai_advice: entry.aiAdvice || null,
        created_at: entry.createdAt || new Date().toISOString(),
      });
    }

    localStorage.setItem(`migrated_${userId}`, "true");
  } catch (e) {
    console.warn("migrateFromLocalStorage error:", e);
  }
}

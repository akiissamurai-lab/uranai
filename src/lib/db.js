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
        weight: data.weight ?? null,
        height: data.height ?? null,
        age: data.age ?? null,
        body_fat: data.bodyFat ?? null,
        gender: data.gender || null,
        goal: data.goal || null,
        activity: data.activity || null,
        goal_weight: data.goalWeight ?? null,
        budget: data.budget ?? null,
        protein_goal: data.proteinGoal ?? null,
        fat_goal: data.fatGoal ?? null,
        carbs_goal: data.carbsGoal ?? null,
        calorie_goal: data.calorieGoal ?? null,
        meal_count: data.mealCount ?? null,
        goal_body_fat: data.goalBodyFat ?? null,
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

// ─── meal_logs (食事記録) ───────────────────────────

export async function saveMealLog(supabase, userId, log) {
  const { data, error } = await supabase.from("meal_logs").insert({
    user_id: userId,
    date: log.date,
    meal_name: log.mealName,
    price: log.price ?? null,
    protein: log.protein ?? null,
    fat: log.fat ?? null,
    carbs: log.carbs ?? null,
    meal_index: log.mealIndex ?? null,
  }).select().single();

  if (error) {
    console.warn("saveMealLog error:", error.message);
    return null;
  }
  return data;
}

export async function loadMealLogs(supabase, userId, date) {
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("loadMealLogs error:", error.message);
    return [];
  }
  return data;
}

export async function deleteMealLog(supabase, userId, logId) {
  const { error } = await supabase
    .from("meal_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    console.warn("deleteMealLog error:", error.message);
  }
}

// ─── ゲストデータ → Supabase 安全同期（ログイン時に実行） ───────
// 【セーフガード】
// 1. 既存クラウドデータはローカルで上書きしない（クラウド優先マージ）
// 2. 全保存成功を確認してからlocalStorageをクリア（部分消失防止）
// 3. localStorage ロックで複数タブの同時実行を防止
export async function migrateAllLocalData(supabase, userId) {
  if (typeof window === "undefined") return;

  // 既に同期済みならスキップ
  const migrated = localStorage.getItem(`guest_migrated_${userId}`);
  if (migrated) return;

  // 複数タブからの同時実行をロック
  const lockKey = `guest_migrating_lock`;
  const existingLock = localStorage.getItem(lockKey);
  if (existingLock) {
    const lockTime = Number(existingLock);
    // 5分以上前のロックは無効（タブクラッシュ対策）
    if (Date.now() - lockTime < 5 * 60 * 1000) {
      console.log("Migration already in progress (another tab), skipping");
      return;
    }
  }
  localStorage.setItem(lockKey, String(Date.now()));

  try {
    const { getAllLocalData, clearAllLocalData } = await import("@/lib/local-db");
    const local = getAllLocalData();
    if (!local || (!local.profile && !local.mealLogs && !local.bodyMetrics && !local.routineMeals && !local.trainingLogs)) {
      // ローカルデータなし → 同期不要、フラグだけ立てる
      localStorage.setItem(`guest_migrated_${userId}`, "true");
      localStorage.removeItem(lockKey);
      return;
    }

    let saveErrors = 0;

    // ── Profile: クラウド優先マージ（既存クラウドデータは上書きしない）──
    if (local.profile) {
      const cloudProfile = await loadProfile(supabase, userId);
      const mergedProfile = {};
      const fields = [
        ["weight", "weight"], ["height", "height"], ["age", "age"],
        ["body_fat", "bodyFat"], ["gender", "gender"], ["goal", "goal"],
        ["activity", "activity"], ["goal_weight", "goalWeight"],
        ["budget", "budget"], ["protein_goal", "proteinGoal"],
        ["fat_goal", "fatGoal"], ["carbs_goal", "carbsGoal"],
        ["calorie_goal", "calorieGoal"], ["meal_count", "mealCount"], ["goal_body_fat", "goalBodyFat"],
      ];
      let hasNewData = false;
      for (const [localKey, dbKey] of fields) {
        // クラウドに値があればクラウド優先、なければローカルで埋める
        const cloudVal = cloudProfile?.[localKey];
        const localVal = local.profile[localKey];
        if (cloudVal != null && cloudVal !== "" && cloudVal !== 0) {
          mergedProfile[dbKey] = cloudVal;
        } else if (localVal != null && localVal !== "" && localVal !== 0) {
          mergedProfile[dbKey] = localVal;
          hasNewData = true;
        }
      }
      if (hasNewData) {
        await saveProfile(supabase, userId, mergedProfile);
      }
    }

    // ── Meal logs: 重複チェック（同じ日・同じ名前・同時刻はスキップ）──
    if (local.mealLogs) {
      for (const dateKey of Object.keys(local.mealLogs)) {
        const cloudLogs = await loadMealLogs(supabase, userId, dateKey);
        const cloudNames = new Set(cloudLogs.map((l) => `${l.meal_name}_${l.price}`));

        for (const log of local.mealLogs[dateKey]) {
          const key = `${log.meal_name}_${log.price}`;
          if (cloudNames.has(key)) continue; // 重複スキップ
          const saved = await saveMealLog(supabase, userId, {
            date: log.date,
            mealName: log.meal_name,
            price: log.price,
            protein: log.protein,
            fat: log.fat,
            carbs: log.carbs,
            mealIndex: log.meal_index,
          });
          if (!saved) saveErrors++;
        }
      }
    }

    // ── Body metrics: クラウドに同日データがなければ追加 ──
    if (local.bodyMetrics && Array.isArray(local.bodyMetrics)) {
      for (const m of local.bodyMetrics) {
        const cloudMetric = await loadBodyMetricByDate(supabase, userId, m.date);
        if (cloudMetric) continue; // クラウドに既存データあり → スキップ
        const ok = await saveBodyMetric(supabase, userId, {
          date: m.date,
          weight: m.weight,
          bodyFat: m.body_fat,
          notes: m.notes,
          weightNight: m.weight_night,
          bodyFatNight: m.body_fat_night,
        });
        if (!ok) saveErrors++;
      }
    }

    // ── Routine meals: 同名ルーティンは重複スキップ ──
    if (local.routineMeals && Array.isArray(local.routineMeals)) {
      const cloudRoutines = await loadRoutineMeals(supabase, userId);
      const cloudRouteNames = new Set(cloudRoutines.map((r) => r.meal_name));

      for (const r of local.routineMeals) {
        if (cloudRouteNames.has(r.meal_name)) continue; // 同名スキップ
        const saved = await saveRoutineMeal(supabase, userId, {
          mealName: r.meal_name,
          emoji: r.emoji,
          price: r.price,
          protein: r.protein,
          fat: r.fat,
          carbs: r.carbs,
        });
        if (!saved) saveErrors++;
      }
    }

    // ── Training logs: 同日・同body_parts は重複スキップ ──
    if (local.trainingLogs && Array.isArray(local.trainingLogs)) {
      for (const tl of local.trainingLogs) {
        const cloudTLs = await loadTrainingLogsByDate(supabase, userId, tl.date);
        const isDup = cloudTLs.some(
          (c) => JSON.stringify([...(c.body_parts || [])].sort()) === JSON.stringify([...(tl.body_parts || [])].sort()) && c.intensity === tl.intensity
        );
        if (isDup) continue;
        const saved = await saveTrainingLog(supabase, userId, {
          date: tl.date,
          bodyParts: tl.body_parts,
          intensity: tl.intensity,
          durationMinutes: tl.duration_minutes,
          notes: tl.notes,
        });
        if (!saved) saveErrors++;
      }
    }

    // ── クリア判定: 全保存成功時のみ localStorage をクリア ──
    if (saveErrors === 0) {
      clearAllLocalData();
      localStorage.setItem(`guest_migrated_${userId}`, "true");
      console.log("Guest data migrated to Supabase successfully");
    } else {
      console.warn(`Migration completed with ${saveErrors} errors — local data preserved for retry`);
      // 次回ログイン時に再試行されるよう、migrated フラグは立てない
    }
  } catch (e) {
    console.warn("migrateAllLocalData error:", e);
    // ローカルデータは消さない（次回再試行）
  } finally {
    localStorage.removeItem(lockKey);
  }
}

// localStorage → DB 移行（初回ログイン時に1回だけ）— レガシー meal_plans用
export async function migrateFromLocalStorage(supabase, userId) {
  if (typeof window === "undefined") return;
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

// ─── routine_meals (マイルーティン飯) ─────────────────────────

export async function saveRoutineMeal(supabase, userId, meal) {
  const { data, error } = await supabase.from("routine_meals").insert({
    user_id: userId,
    meal_name: meal.mealName,
    emoji: meal.emoji || "#4ade80",
    price: meal.price ?? null,
    protein: meal.protein ?? null,
    fat: meal.fat ?? null,
    carbs: meal.carbs ?? null,
  }).select().single();

  if (error) {
    console.warn("saveRoutineMeal error:", error.message);
    return null;
  }
  return data;
}

export async function loadRoutineMeals(supabase, userId) {
  const { data, error } = await supabase
    .from("routine_meals")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("loadRoutineMeals error:", error.message);
    return [];
  }
  return data;
}

export async function updateRoutineMeal(supabase, userId, mealId, updates) {
  const { error } = await supabase
    .from("routine_meals")
    .update(updates)
    .eq("id", mealId)
    .eq("user_id", userId);

  if (error) {
    console.warn("updateRoutineMeal error:", error.message);
    return false;
  }
  return true;
}

export async function deleteRoutineMeal(supabase, userId, mealId) {
  const { error } = await supabase
    .from("routine_meals")
    .delete()
    .eq("id", mealId)
    .eq("user_id", userId);

  if (error) {
    console.warn("deleteRoutineMeal error:", error.message);
  }
}

// ─── body_metrics (体重・体脂肪率) ─────────────────────────

export async function saveBodyMetric(supabase, userId, { date, weight, bodyFat, notes, weightNight, bodyFatNight }) {
  const { error } = await supabase
    .from("body_metrics")
    .upsert(
      {
        user_id: userId,
        date,
        weight: weight ?? null,
        body_fat: bodyFat ?? null,
        notes: notes || null,
        weight_night: weightNight ?? null,
        body_fat_night: bodyFatNight ?? null,
      },
      { onConflict: "user_id,date" }
    );

  if (error) {
    console.warn("saveBodyMetric error:", error.message);
    return false;
  }
  return true;
}

export async function loadBodyMetrics(supabase, userId, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .gte("date", sinceStr)
    .order("date", { ascending: true });

  if (error) {
    console.warn("loadBodyMetrics error:", error.message);
    return [];
  }
  return data;
}

// ─── training_logs (トレーニング記録) ─────────────────────────

export async function saveTrainingLog(supabase, userId, log) {
  const { data, error } = await supabase.from("training_logs").insert({
    user_id: userId,
    date: log.date,
    body_parts: log.bodyParts,
    intensity: log.intensity ?? null,
    duration_minutes: log.durationMinutes ?? null,
    notes: log.notes || null,
  }).select().single();

  if (error) {
    console.warn("saveTrainingLog error:", error.message);
    return null;
  }
  return data;
}

export async function updateTrainingLog(supabase, userId, logId, updates) {
  const updateObj = {};
  if (updates.bodyParts !== undefined) updateObj.body_parts = updates.bodyParts;
  if (updates.intensity !== undefined) updateObj.intensity = updates.intensity;
  if (updates.durationMinutes !== undefined) updateObj.duration_minutes = updates.durationMinutes;
  if (updates.notes !== undefined) updateObj.notes = updates.notes;

  const { error } = await supabase
    .from("training_logs")
    .update(updateObj)
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    console.warn("updateTrainingLog error:", error.message);
    return false;
  }
  return true;
}

export async function loadTrainingLogsByDate(supabase, userId, date) {
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("loadTrainingLogsByDate error:", error.message);
    return [];
  }
  return data;
}

export async function loadTrainingLogsRange(supabase, userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("date", sinceStr)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("loadTrainingLogsRange error:", error.message);
    return [];
  }
  return data;
}

export async function deleteTrainingLog(supabase, userId, logId) {
  const { error } = await supabase
    .from("training_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    console.warn("deleteTrainingLog error:", error.message);
  }
}

// ─── 体調メモ（notes のみ保存 — weight/body_fat を壊さない） ────

export async function saveDailyNotes(supabase, userId, date, notes) {
  const existing = await loadBodyMetricByDate(supabase, userId, date);

  if (existing) {
    const { error } = await supabase
      .from("body_metrics")
      .update({ notes: notes || null })
      .eq("user_id", userId)
      .eq("date", date);

    if (error) {
      console.warn("saveDailyNotes update error:", error.message);
      return false;
    }
    return true;
  } else {
    const { error } = await supabase
      .from("body_metrics")
      .insert({ user_id: userId, date, weight: null, body_fat: null, notes: notes || null });

    if (error) {
      console.warn("saveDailyNotes insert error:", error.message);
      return false;
    }
    return true;
  }
}

// ─── meal_logs 範囲取得（AI coach 用） ────────────────────────

export async function loadMealLogsRange(supabase, userId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("date", sinceStr)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("loadMealLogsRange error:", error.message);
    return [];
  }
  return data;
}

// ─── ストリーク計算（連続記録日数） ────────────────────────

function countStreak(datesDesc) {
  if (datesDesc.length === 0) return 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  // ストリークは今日か昨日から始まる
  if (datesDesc[0] !== todayStr && datesDesc[0] !== yesterdayStr) return 0;
  let streak = 1;
  for (let i = 1; i < datesDesc.length; i++) {
    const prev = new Date(datesDesc[i - 1] + "T00:00");
    const curr = new Date(datesDesc[i] + "T00:00");
    if ((prev - curr) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

export async function loadMealLogStreak(supabase, userId) {
  const since = new Date(); since.setDate(since.getDate() - 90);
  const { data, error } = await supabase
    .from("meal_logs")
    .select("date")
    .eq("user_id", userId)
    .gte("date", since.toISOString().slice(0, 10))
    .order("date", { ascending: false });
  if (error || !data) return 0;
  const unique = [...new Set(data.map(d => d.date))].sort().reverse();
  return countStreak(unique);
}

export async function loadBodyMetricByDate(supabase, userId, date) {
  const { data, error } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .single();

  if (error) {
    if (error.code !== "PGRST116") console.warn("loadBodyMetricByDate error:", error.message);
    return null;
  }
  return data;
}

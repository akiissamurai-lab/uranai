// ローカルストレージ版 CRUD — ゲストモード用
// db.js と同じインターフェース（supabase/userId パラメータ不要）
// ※ SSR安全: すべての localStorage アクセスに typeof window チェック付き

const KEYS = {
  profile: "guest_profile",
  mealLogs: "guest_meal_logs",
  bodyMetrics: "guest_body_metrics",
  routineMeals: "guest_routine_meals",
  trainingLogs: "guest_training_logs",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function get(key) {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function set(key, data) {
  if (!isBrowser()) return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function uid() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

// ─── Profile ──────────────────────────────────────────────────

export function saveLocalProfile(data) {
  const existing = get(KEYS.profile) || {};
  const merged = { ...existing, ...data };
  set(KEYS.profile, merged);
}

export function loadLocalProfile() {
  return get(KEYS.profile);
}

// ─── Meal Logs ────────────────────────────────────────────────

export function saveLocalMealLog(log) {
  const all = get(KEYS.mealLogs) || {};
  const dateKey = log.date;
  if (!all[dateKey]) all[dateKey] = [];

  const entry = {
    id: uid(),
    meal_name: log.mealName,
    date: log.date,
    price: log.price ?? null,
    protein: log.protein ?? null,
    fat: log.fat ?? null,
    carbs: log.carbs ?? null,
    meal_index: log.mealIndex ?? null,
    created_at: now(),
  };
  all[dateKey].push(entry);
  set(KEYS.mealLogs, all);
  return entry;
}

export function loadLocalMealLogs(date) {
  const all = get(KEYS.mealLogs) || {};
  return all[date] || [];
}

export function deleteLocalMealLog(logId) {
  const all = get(KEYS.mealLogs) || {};
  for (const dateKey in all) {
    all[dateKey] = all[dateKey].filter((l) => l.id !== logId);
    if (all[dateKey].length === 0) delete all[dateKey];
  }
  set(KEYS.mealLogs, all);
}

// ─── ストリーク計算（連続記録日数） ─────────────────────────
export function loadLocalMealLogStreak() {
  const all = get(KEYS.mealLogs) || {};
  const dates = Object.keys(all).filter(d => (all[d] || []).length > 0).sort().reverse();
  if (dates.length === 0) return 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00");
    const curr = new Date(dates[i] + "T00:00");
    if ((prev - curr) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

// ─── Body Metrics ─────────────────────────────────────────────

export function saveLocalBodyMetric({ date, weight, bodyFat, notes, weightNight, bodyFatNight }) {
  const all = get(KEYS.bodyMetrics) || [];
  const idx = all.findIndex((m) => m.date === date);
  const entry = {
    id: idx >= 0 ? all[idx].id : uid(),
    date,
    weight: weight ?? null,
    body_fat: bodyFat ?? null,
    weight_night: weightNight ?? null,
    body_fat_night: bodyFatNight ?? null,
    notes: notes || null,
    created_at: idx >= 0 ? all[idx].created_at : now(),
    updated_at: now(),
  };
  if (idx >= 0) {
    all[idx] = entry;
  } else {
    all.push(entry);
  }
  all.sort((a, b) => a.date.localeCompare(b.date));
  set(KEYS.bodyMetrics, all);
  return true;
}

export function loadLocalBodyMetrics(days = 90) {
  const all = get(KEYS.bodyMetrics) || [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  return all.filter((m) => m.date >= sinceStr);
}

export function loadLocalBodyMetricByDate(date) {
  const all = get(KEYS.bodyMetrics) || [];
  return all.find((m) => m.date === date) || null;
}

// ─── 体調メモ（notes のみ保存 — weight/body_fat を壊さない）────

export function saveLocalDailyNotes(date, notes) {
  const all = get(KEYS.bodyMetrics) || [];
  const idx = all.findIndex((m) => m.date === date);

  if (idx >= 0) {
    all[idx] = { ...all[idx], notes: notes || null, updated_at: now() };
  } else {
    all.push({
      id: uid(),
      date,
      weight: null,
      body_fat: null,
      weight_night: null,
      body_fat_night: null,
      notes: notes || null,
      created_at: now(),
      updated_at: now(),
    });
    all.sort((a, b) => a.date.localeCompare(b.date));
  }

  set(KEYS.bodyMetrics, all);
  return true;
}

// ─── Routine Meals ────────────────────────────────────────────

export function saveLocalRoutineMeal(meal) {
  const all = get(KEYS.routineMeals) || [];
  const entry = {
    id: uid(),
    meal_name: meal.mealName,
    emoji: meal.emoji || "#4ade80",
    price: meal.price ?? null,
    protein: meal.protein ?? null,
    fat: meal.fat ?? null,
    carbs: meal.carbs ?? null,
    sort_order: 0,
    created_at: now(),
  };
  all.push(entry);
  set(KEYS.routineMeals, all);
  return entry;
}

export function loadLocalRoutineMeals() {
  return get(KEYS.routineMeals) || [];
}

export function deleteLocalRoutineMeal(mealId) {
  const all = get(KEYS.routineMeals) || [];
  set(KEYS.routineMeals, all.filter((r) => r.id !== mealId));
}

// ─── Training Logs ────────────────────────────────────────────

export function saveLocalTrainingLog(log) {
  const all = get(KEYS.trainingLogs) || [];
  const entry = {
    id: uid(),
    date: log.date,
    body_parts: log.bodyParts,
    intensity: log.intensity ?? null,
    duration_minutes: log.durationMinutes ?? null,
    notes: log.notes || null,
    created_at: now(),
    updated_at: now(),
  };
  all.push(entry);
  all.sort((a, b) => a.date.localeCompare(b.date));
  set(KEYS.trainingLogs, all);
  return entry;
}

export function loadLocalTrainingLogsByDate(date) {
  const all = get(KEYS.trainingLogs) || [];
  return all.filter((t) => t.date === date);
}

export function loadLocalTrainingLogsRange(days = 30) {
  const all = get(KEYS.trainingLogs) || [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  return all.filter((t) => t.date >= sinceStr);
}

export function deleteLocalTrainingLog(logId) {
  const all = get(KEYS.trainingLogs) || [];
  set(KEYS.trainingLogs, all.filter((t) => t.id !== logId));
}

// ─── データ同期用 ─────────────────────────────────────────────

export function getAllLocalData() {
  return {
    profile: get(KEYS.profile),
    mealLogs: get(KEYS.mealLogs),
    bodyMetrics: get(KEYS.bodyMetrics),
    routineMeals: get(KEYS.routineMeals),
    trainingLogs: get(KEYS.trainingLogs),
  };
}

export function clearAllLocalData() {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

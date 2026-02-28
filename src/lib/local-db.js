// ローカルストレージ版 CRUD — ゲストモード用
// db.js と同じインターフェース（supabase/userId パラメータ不要）
// ※ SSR安全: すべての localStorage アクセスに typeof window チェック付き

const KEYS = {
  profile: "guest_profile",
  mealLogs: "guest_meal_logs",
  bodyMetrics: "guest_body_metrics",
  routineMeals: "guest_routine_meals",
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
    price: log.price || null,
    protein: log.protein || null,
    fat: log.fat || null,
    carbs: log.carbs || null,
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

// ─── Body Metrics ─────────────────────────────────────────────

export function saveLocalBodyMetric({ date, weight, bodyFat, notes }) {
  const all = get(KEYS.bodyMetrics) || [];
  const idx = all.findIndex((m) => m.date === date);
  const entry = {
    id: idx >= 0 ? all[idx].id : uid(),
    date,
    weight: weight || null,
    body_fat: bodyFat || null,
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
    price: meal.price || null,
    protein: meal.protein || null,
    fat: meal.fat || null,
    carbs: meal.carbs || null,
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

// ─── データ同期用 ─────────────────────────────────────────────

export function getAllLocalData() {
  return {
    profile: get(KEYS.profile),
    mealLogs: get(KEYS.mealLogs),
    bodyMetrics: get(KEYS.bodyMetrics),
    routineMeals: get(KEYS.routineMeals),
  };
}

export function clearAllLocalData() {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}

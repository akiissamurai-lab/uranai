"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { loadProfile, saveProfile, saveMealPlan, loadMealPlans, migrateFromLocalStorage } from "@/lib/db";
import AuthGate from "@/components/AuthGate";

/*
 * マクロ飯ビルダー v3 — Next.js App Router version
 * API call is proxied through /api/macro to hide the API key.
 * History uses localStorage instead of window.storage.
 */

// ─── Food Database ──────────────────────────────────────────────
const FOOD_DB = [
  { id: "chicken_breast", name: "鶏むね肉(皮なし)", unit: "100g", cost: 65, protein: 23.3, fat: 1.9, carbs: 0, cal: 113, cat: "meat" },
  { id: "egg", name: "卵(1個)", unit: "1個", cost: 22, protein: 6.2, fat: 5.2, carbs: 0.2, cal: 76, cat: "egg" },
  { id: "tofu", name: "木綿豆腐", unit: "150g(半丁)", cost: 30, protein: 10.5, fat: 6.3, carbs: 2.4, cal: 108, cat: "soy" },
  { id: "natto", name: "納豆(1パック)", unit: "45g", cost: 33, protein: 7.4, fat: 4.5, carbs: 5.4, cal: 90, cat: "soy" },
  { id: "tuna_can", name: "ツナ缶(水煮)", unit: "1缶70g", cost: 108, protein: 16.0, fat: 0.7, carbs: 0.2, cal: 71, cat: "fish" },
  { id: "milk", name: "牛乳", unit: "200ml", cost: 40, protein: 6.6, fat: 7.6, carbs: 9.6, cal: 134, cat: "dairy" },
  { id: "oatmeal", name: "オートミール", unit: "40g", cost: 32, protein: 4.4, fat: 2.3, carbs: 27.6, cal: 152, cat: "grain" },
  { id: "rice", name: "白米(炊飯後)", unit: "150g(1杯)", cost: 30, protein: 3.8, fat: 0.5, carbs: 55.7, cal: 252, cat: "grain" },
  { id: "banana", name: "バナナ", unit: "1本", cost: 30, protein: 1.1, fat: 0.2, carbs: 22.5, cal: 86, cat: "fruit" },
  { id: "protein_powder", name: "プロテインパウダー", unit: "1杯30g", cost: 55, protein: 21.0, fat: 1.5, carbs: 3.0, cal: 118, cat: "supp" },
  { id: "saba_can", name: "鯖缶(水煮)", unit: "1缶190g", cost: 158, protein: 26.8, fat: 21.4, carbs: 0, cal: 304, cat: "fish" },
  { id: "broccoli", name: "ブロッコリー(冷凍)", unit: "100g", cost: 45, protein: 4.3, fat: 0.5, carbs: 5.2, cal: 33, cat: "veg" },
  { id: "moyashi", name: "もやし", unit: "1袋200g", cost: 28, protein: 3.4, fat: 0.2, carbs: 5.2, cal: 28, cat: "veg" },
  { id: "chikuwa", name: "ちくわ(4本)", unit: "4本120g", cost: 88, protein: 14.6, fat: 2.4, carbs: 16.3, cal: 145, cat: "fish" },
  { id: "kanikama", name: "カニカマ", unit: "1パック75g", cost: 78, protein: 9.2, fat: 0.4, carbs: 6.8, cal: 68, cat: "fish" },
  { id: "chicken_thigh", name: "鶏もも肉", unit: "100g", cost: 88, protein: 16.6, fat: 14.2, carbs: 0, cal: 204, cat: "meat" },
  { id: "soymilk", name: "豆乳", unit: "200ml", cost: 42, protein: 7.2, fat: 3.6, carbs: 6.2, cal: 88, cat: "soy" },
  { id: "bread", name: "食パン(6枚切1枚)", unit: "1枚60g", cost: 25, protein: 5.3, fat: 2.5, carbs: 28.0, cal: 158, cat: "grain" },
  { id: "cabbage", name: "キャベツ", unit: "100g", cost: 18, protein: 1.3, fat: 0.2, carbs: 5.2, cal: 23, cat: "veg" },
  { id: "yogurt", name: "ヨーグルト(無糖)", unit: "100g", cost: 28, protein: 3.6, fat: 3.0, carbs: 4.9, cal: 62, cat: "dairy" },
];

const CAT_LABELS = { meat: "肉類", fish: "魚介", egg: "卵", soy: "大豆", dairy: "乳製品", grain: "穀物", veg: "野菜", fruit: "果物", supp: "サプリ" };
const CAT_EMOJI = { meat: "🥩", fish: "🐟", egg: "🥚", soy: "🫘", dairy: "🥛", grain: "🌾", veg: "🥦", fruit: "🍌", supp: "💊" };

// ─── Improved Solver: category diversity + controlled randomness ─
function solveMealPlan(budget, targetProtein, targetCal, excludedIds, catExclusions) {
  const available = FOOD_DB.filter(f => {
    if (excludedIds.includes(f.id)) return false;
    if (catExclusions.includes(f.cat)) return false;
    return true;
  });

  const catLimits = { meat: 3, fish: 2, egg: 4, soy: 3, dairy: 2, grain: 3, veg: 2, fruit: 2, supp: 2 };
  const catCount = {};

  const scored = available.map(f => ({
    ...f,
    score: (f.protein / f.cost) * (0.85 + Math.random() * 0.3),
  })).sort((a, b) => b.score - a.score);

  let rb = budget, rp = targetProtein;
  let t = { protein: 0, fat: 0, carbs: 0, cal: 0, cost: 0 };
  const plan = [];
  const add = (food, s) => {
    plan.push({ ...food, servings: s });
    catCount[food.cat] = (catCount[food.cat] || 0) + s;
    rb -= food.cost * s; t.protein += food.protein * s; t.fat += food.fat * s;
    t.carbs += food.carbs * s; t.cal += food.cal * s; t.cost += food.cost * s;
  };

  for (const food of scored) {
    if (rp <= 0 || rb <= 0) break;
    const catRemain = catLimits[food.cat] - (catCount[food.cat] || 0);
    if (catRemain <= 0) continue;
    const s = Math.min(Math.floor(rb / food.cost), Math.ceil(rp / food.protein), catRemain);
    if (s <= 0) continue;
    add(food, s); rp -= food.protein * s;
  }

  if (targetCal && t.cal < targetCal && rb > 0) {
    const calF = available.filter(f => !plan.find(p => p.id === f.id)).sort((a, b) => (b.cal / b.cost) - (a.cal / a.cost));
    for (const food of calF) {
      if (rb <= 0 || t.cal >= targetCal) break;
      const catRemain = catLimits[food.cat] - (catCount[food.cat] || 0);
      const s = Math.min(Math.floor(rb / food.cost), catRemain, 2);
      if (s <= 0) continue; add(food, s);
    }
  }

  if (!plan.some(p => p.cat === "veg")) {
    const vegs = available.filter(f => f.cat === "veg");
    for (const v of vegs) { if (rb >= v.cost) { add(v, 1); break; } }
  }

  return { items: plan, totals: t, remaining: rb, proteinReached: t.protein >= targetProtein * 0.95 };
}

// ─── Mifflin-St Jeor with gender ───────────────────────────────
function calcBMR(weight, height, age, gender) {
  if (!weight) return null;
  if (height && age) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return gender === "female" ? base - 161 : base + 5;
  }
  return weight * 24;
}

function calcTDEE(bmr, activity, goal) {
  if (!bmr) return 2000;
  const mult = { low: 1.2, moderate: 1.55, high: 1.725 }[activity] || 1.55;
  let tdee = bmr * mult;
  if (goal === "reduce") tdee -= 500;
  if (goal === "bulk") tdee += 300;
  return Math.round(tdee / 50) * 50;
}

// ─── AI via Next.js API Route ───────────────────────────────────
async function fetchAIAdvice(profile, plan, signal) {
  const items = plan.items.map(i => `${i.name} ×${i.servings} (P:${(i.protein * i.servings).toFixed(1)}g, ¥${i.cost * i.servings})`).join("\n");
  const lines = [
    `目的: ${profile.goal}`, `性別: ${profile.gender}`, `体重: ${profile.weight}kg`,
    profile.height && `身長: ${profile.height}cm`, profile.bmi && `BMI: ${profile.bmi}`,
    profile.bodyFat && `体脂肪率: ${profile.bodyFat}%`, profile.age && `年齢: ${profile.age}歳`,
    profile.goalWeight && `目標体重: ${profile.goalWeight}kg`,
    `活動: ${profile.activity}`, `予算: ¥${profile.budget}/日`,
    `目標P: ${profile.protein}g / Cal: ${profile.calories}kcal`,
    profile.deadline && `期限: ${profile.deadline}`,
    profile.exclusions && `除外: ${profile.exclusions}`,
  ].filter(Boolean).join("\n");

  const prompt = `あなたは日本のフィットネス栄養士兼節約コーチ。

## ユーザー
${lines}

## 食材プラン
${items}
合計: P:${plan.totals.protein.toFixed(1)}g F:${plan.totals.fat.toFixed(1)}g C:${plan.totals.carbs.toFixed(1)}g ${Math.round(plan.totals.cal)}kcal ¥${Math.round(plan.totals.cost)}

## 必ず以下のJSON形式のみで返答。前後にテキストを一切付けないでください。
{"personalMessage":"2-3文のパーソナルメッセージ（性別・年齢・BMI・体脂肪率・期限すべて考慮）","meals":[{"timing":"朝食","name":"料理名","emoji":"絵文字","ingredients":"食材","recipe":"3ステップ以内","macros":"P:○g F:○g C:○g ○kcal"},{"timing":"昼食","name":"...","emoji":"...","ingredients":"...","recipe":"...","macros":"..."},{"timing":"夕食","name":"...","emoji":"...","ingredients":"...","recipe":"...","macros":"..."},{"timing":"間食","name":"...","emoji":"...","ingredients":"...","recipe":"...","macros":"..."}],"weeklyTip":"週間戦略2-3文","warning":"注意点またはnull","productTips":"年齢・性別に合わせたおすすめ商品アドバイス1-2文"}`;

  const res = await fetch("/api/macro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 429) {
      const retry = errData.retryAfter || 60;
      throw new Error(`⏳ 利用制限中です。${retry}秒後にお試しください（1分間に3回まで）`);
    }
    throw new Error(errData.error || `API error: ${res.status}`);
  }

  const data = await res.json();
  const raw = data.content?.map(b => b.text || "").join("") || "";

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  const jsonStr = raw.slice(start, end + 1);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const cleaned = jsonStr.replace(/[\x00-\x1F]/g, " ").replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    try { return JSON.parse(cleaned); } catch { throw new Error("Failed to parse AI response"); }
  }
}

// ─── Storage helpers (localStorage) ─────────────────────────────
function saveHistory(entry) {
  try {
    const raw = localStorage.getItem("macro_history");
    const history = raw ? JSON.parse(raw) : [];
    history.unshift({ ...entry, id: Date.now(), date: new Date().toLocaleDateString("ja-JP") });
    if (history.length > 10) history.length = 10;
    localStorage.setItem("macro_history", JSON.stringify(history));
    return history;
  } catch { return []; }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem("macro_history");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── UI Components ──────────────────────────────────────────────
function MacroRing({ label, value, max, color, unit, ideal }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 36, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="88" height="88" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform="rotate(-90 40 40)" style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x="40" y="36" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="'DM Sans',sans-serif">{Math.round(value)}</text>
        <text x="40" y="49" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="'DM Sans',sans-serif">{unit}</text>
      </svg>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: -4 }}>{label}</div>
      {ideal && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>目標 {ideal}{unit}</div>}
    </div>
  );
}

function SliderInput({ label, value, setValue, min, max, step, color, suffix = "", prefix = "", editable = false }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{label}</label>
        {editable ? (
          <NumInput value={value} onChange={v => setValue(v === "" ? min : v)} suffix={suffix} prefix={prefix} min={min} max={max} step={step} width={65} color={color} />
        ) : (
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color }}>{prefix}{value}<span style={{ fontSize: 13 }}>{suffix}</span></span>
        )}
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => setValue(+e.target.value)}
        style={{ width: "100%", height: 6, borderRadius: 3, appearance: "none", background: `linear-gradient(to right,${color} ${pct}%,rgba(255,255,255,0.08) ${pct}%)`, cursor: "pointer", outline: "none" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
        <span>{prefix}{min.toLocaleString()}{suffix}</span><span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

function NumInput({ value, onChange, placeholder, suffix, prefix, min, max, step = 1, width = 70, color = "#22c55e" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 10px" }}>
      {prefix && <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>{prefix}</span>}
      <input type="number" inputMode="decimal"
        value={editing ? draft : (value ?? "")}
        placeholder={placeholder || "—"} min={min} max={max} step={step}
        onFocus={e => { setEditing(true); setDraft(value === "" || value == null ? "" : String(value)); e.target.select(); }}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft === "") { onChange(""); return; }
          const num = parseFloat(draft);
          if (isNaN(num)) { onChange(""); return; }
          const lo = min != null ? min : -Infinity;
          const hi = max != null ? max : Infinity;
          onChange(Math.max(lo, Math.min(hi, num)));
        }}
        style={{ width, background: "transparent", border: "none", outline: "none", color, fontFamily: "'Space Mono',monospace", fontSize: 17, fontWeight: 700, textAlign: "right" }} />
      {suffix && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{suffix}</span>}
    </div>
  );
}

function StepperInput({ value, onChange, min, max, step, bigStep, suffix, color = "#22c55e", width = 75, inputStep }) {
  const nudge = (delta) => {
    const next = +(parseFloat(value || 0) + delta).toFixed(2);
    onChange(Math.max(min, Math.min(max, next)));
  };
  const btnStyle = {
    width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)",
    fontSize: 18, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s", lineHeight: 1,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => nudge(-(bigStep || step))} style={btnStyle} aria-label="減らす">−</button>
      <NumInput value={value} onChange={onChange} suffix={suffix} min={min} max={max} step={inputStep || step} width={width} color={color} />
      <button onClick={() => nudge(bigStep || step)} style={btnStyle} aria-label="増やす">+</button>
    </div>
  );
}

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, verticalAlign: "middle" }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
    </span>
  );
}

function StreamText({ text }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); const id = setInterval(() => setN(p => p >= text.length ? (clearInterval(id), p) : p + 1), 20); return () => clearInterval(id); }, [text]);
  return <>{text.slice(0, n)}{n < text.length && <span style={{ animation: "blink 0.8s infinite" }}>|</span>}</>;
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.2s",
      border: active ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.1)",
      background: active ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
      color: active ? "#4ade80" : "rgba(255,255,255,0.45)", fontFamily: "'Noto Sans JP',sans-serif",
    }}>{children}</button>
  );
}

function SectionCard({ num, title, summary, collapsed, onToggle, color = "#4ade80", bgColor = "rgba(34,197,94,0.15)", children }) {
  return (
    <div style={{
      background: collapsed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.03)",
      border: collapsed ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20, padding: collapsed ? "14px 20px" : "22px 20px", marginBottom: 14,
      animation: "fadeUp 0.4s ease-out", transition: "all 0.3s ease",
    }}>
      <div onClick={collapsed ? onToggle : undefined} style={{
        fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: collapsed ? 0 : 14,
        display: "flex", alignItems: "center", gap: 6, cursor: collapsed ? "pointer" : "default",
        minHeight: collapsed ? 24 : "auto",
      }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: bgColor, color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</span>
        <span style={{ flexShrink: 0 }}>{title}</span>
        {collapsed && <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary} ✏️</span>}
      </div>
      {!collapsed && children}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────────
export default function Home() {
  const [weight, setWeight] = useState(65.00);
  const [gender, setGender] = useState("male");
  const [goal, setGoal] = useState("reduce");
  const [activity, setActivity] = useState("moderate");
  const [height, setHeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [age, setAge] = useState("");
  const [deadline, setDeadline] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [errors, setErrors] = useState({});
  const [budget, setBudget] = useState(2000);
  const [protein, setProtein] = useState(120);
  const [calories, setCalories] = useState(2000);
  const [excludedCats, setExcludedCats] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);
  const [showFoodPicker, setShowFoodPicker] = useState(false);
  const [step, setStep] = useState("profile");
  const [result, setResult] = useState(null);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [activeTab, setActiveTab] = useState("ai");
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [calcBasis, setCalcBasis] = useState("");
  const resultRef = useRef(null);
  const abortRef = useRef(null);
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const profileSaveTimer = useRef(null);
  const hasCustomProtein = useRef(false);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // Auth状態変化: ログイン時にDB読み込み + localStorage移行
  const handleAuthChange = useCallback(async (authUser) => {
    setUser(authUser);
    if (authUser) {
      // プロフィール復元
      const profile = await loadProfile(supabase, authUser.id);
      if (profile) {
        if (profile.weight) setWeight(profile.weight);
        if (profile.height) setHeight(profile.height);
        if (profile.age) setAge(profile.age);
        if (profile.body_fat) setBodyFat(profile.body_fat);
        if (profile.gender) setGender(profile.gender);
        if (profile.goal) setGoal(profile.goal);
        if (profile.activity) setActivity(profile.activity);
        if (profile.goal_weight) setGoalWeight(profile.goal_weight);
        if (profile.budget) setBudget(profile.budget);
        // PFC目標値（設定ページで保存した値で自動計算を上書き）
        if (profile.protein_goal) {
          setProtein(profile.protein_goal);
          hasCustomProtein.current = true;
        }
      }
      // localStorage→DB移行
      await migrateFromLocalStorage(supabase, authUser.id);
      // DB履歴読み込み
      const plans = await loadMealPlans(supabase, authUser.id);
      if (plans.length > 0) {
        setHistory(plans.map(p => ({
          id: p.id,
          date: new Date(p.created_at).toLocaleDateString("ja-JP"),
          weight: null,
          goal: null,
          budget: p.budget,
          protein: Math.round(p.total_protein || 0),
          cal: Math.round(p.total_cal || 0),
          cost: Math.round(p.total_cost || 0),
        })));
      }
    } else {
      // ログアウト時: localStorageの履歴に戻す
      setHistory(loadHistory());
    }
  }, [supabase]);

  const bmi = (height && weight) ? (weight / ((height / 100) ** 2)).toFixed(1) : null;
  const bmiCat = bmi ? (bmi < 18.5 ? "低体重" : bmi < 25 ? "普通" : bmi < 30 ? "肥満1度" : "肥満2度+") : null;
  const bmiCol = bmi ? (bmi < 18.5 ? "#60a5fa" : bmi < 25 ? "#4ade80" : bmi < 30 ? "#fbbf24" : "#ef4444") : "#4ade80";

  useEffect(() => {
    if (!weight) return;
    const bmr = calcBMR(weight, height || null, age || null, gender);
    const tdee = calcTDEE(bmr, activity, goal);
    setCalories(tdee);

    const lean = bodyFat ? weight * (1 - bodyFat / 100) : weight;

    // 設定ページでカスタム値が保存されていない場合のみ自動計算
    if (!hasCustomProtein.current) {
      let pMult = goal === "bulk" ? 2.0 : goal === "reduce" ? 1.8 : 1.5;
      if (age && age >= 50) pMult = Math.max(pMult, 1.6);
      setProtein(Math.round(lean * pMult));
    }

    if (height && age) {
      setCalcBasis(`Mifflin-St Jeor式（${gender === "female" ? "女性" : "男性"}）: BMR=${Math.round(bmr)}kcal × 活動係数 ${goal === "reduce" ? "- 500kcal" : goal === "bulk" ? "+ 300kcal" : ""}`);
    } else {
      setCalcBasis(`簡易計算: 体重${weight}kg × ${goal === "bulk" ? 35 : goal === "reduce" ? 25 : 30}kcal${bodyFat ? `（除脂肪体重${Math.round(lean)}kgでP計算）` : ""}`);
    }
  }, [weight, goal, activity, age, height, bodyFat, gender]);

  // ログイン中: プロフィール自動保存 (2秒デバウンス)
  useEffect(() => {
    if (!user) return;
    if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(() => {
      saveProfile(supabase, user.id, { weight, height, age, bodyFat, gender, goal, activity, goalWeight, budget });
    }, 2000);
    return () => { if (profileSaveTimer.current) clearTimeout(profileSaveTimer.current); };
  }, [user, supabase, weight, height, age, bodyFat, gender, goal, activity, goalWeight, budget]);

  const daysLeft = deadline ? Math.max(0, Math.ceil((new Date(deadline) - new Date()) / 86400000)) : null;

  const validate = useCallback(() => {
    const errs = {};
    if (!weight || weight < 30 || weight > 200) errs.weight = "体重を30〜200kgの範囲で入力してください";
    if (goalWeight !== "" && (goalWeight < 20 || goalWeight > 200)) errs.goalWeight = "目標体重を20〜200kgの範囲で入力";
    if (bodyFat !== "" && (bodyFat < 3 || bodyFat > 60)) errs.bodyFat = "体脂肪率を3〜60%の範囲で入力";
    if (age !== "" && (age < 10 || age > 120)) errs.age = "年齢を10〜120歳の範囲で入力";
    if (height !== "" && (height < 100 || height > 220)) errs.height = "身長を100〜220cmの範囲で入力";
    if (goalWeight && weight && goal === "reduce" && goalWeight >= weight) errs.goalWeight = "減量目標: 現在の体重より低く設定";
    if (goalWeight && weight && goal === "bulk" && goalWeight <= weight) errs.goalWeight = "増量目標: 現在の体重より高く設定";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [weight, goalWeight, bodyFat, age, height, goal]);

  const handleGenerate = useCallback(async () => {
    if (!validate()) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const plan = solveMealPlan(budget, protein, calories, excludedIds, excludedCats);
    setResult(plan); setAiAdvice(null); setAiError(null); setAiLoading(true);
    setActiveTab("ai"); setExpandedMeal(null); setStep("result");
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);

    const entry = { weight, goal, budget, protein: Math.round(plan.totals.protein), cal: Math.round(plan.totals.cal), cost: Math.round(plan.totals.cost) };
    if (!user) {
      setHistory(saveHistory(entry));
    }

    // ログイン中: DBに保存
    if (user) {
      saveMealPlan(supabase, user.id, {
        budget,
        proteinTarget: protein,
        calorieTarget: calories,
        totalProtein: plan.totals.protein,
        totalFat: plan.totals.fat,
        totalCarbs: plan.totals.carbs,
        totalCal: plan.totals.cal,
        totalCost: plan.totals.cost,
        items: plan.items.map(i => ({ id: i.id, name: i.name, servings: i.servings, cost: i.cost, protein: i.protein, fat: i.fat, carbs: i.carbs, cal: i.cal })),
      }).then(() => {
        // DB履歴を再読み込み
        loadMealPlans(supabase, user.id).then(plans => {
          if (plans.length > 0) {
            setHistory(plans.map(p => ({
              id: p.id,
              date: new Date(p.created_at).toLocaleDateString("ja-JP"),
              weight: null, goal: null, budget: p.budget,
              protein: Math.round(p.total_protein || 0),
              cal: Math.round(p.total_cal || 0),
              cost: Math.round(p.total_cost || 0),
            })));
          }
        });
      });
    }

    try {
      const excl = [...excludedCats.map(c => CAT_LABELS[c]), ...excludedIds.map(id => FOOD_DB.find(f => f.id === id)?.name)].filter(Boolean).join("、");
      const advice = await fetchAIAdvice({
        goal: { reduce: "減量", bulk: "増量", maintain: "維持" }[goal],
        gender: gender === "female" ? "女性" : "男性",
        weight, height: height || null, bmi: bmi || null, bodyFat: bodyFat || null,
        goalWeight: goalWeight || null,
        age: age || null, activity: { low: "低い", moderate: "普通", high: "高い" }[activity],
        budget, protein, calories, exclusions: excl || null,
        deadline: deadline && daysLeft ? `${deadline}（残り${daysLeft}日）` : null,
      }, plan, ctrl.signal);
      if (!ctrl.signal.aborted) setAiAdvice(advice);
    } catch (e) {
      if (e.name !== "AbortError") setAiError(`AI分析に失敗: ${e.message}。買い物プランは使えます。`);
    } finally {
      if (!ctrl.signal.aborted) setAiLoading(false);
    }
  }, [budget, protein, calories, excludedIds, excludedCats, goal, weight, activity, height, bodyFat, age, deadline, bmi, daysLeft, gender, validate, goalWeight, user, supabase]);

  const handleShare = () => {
    if (!result) return;
    const text = [
      `🍗 マクロ飯ビルダー結果`,
      `予算: ¥${budget}/日 → ¥${Math.round(result.totals.cost)}使用`,
      `P:${Math.round(result.totals.protein)}g F:${Math.round(result.totals.fat)}g C:${Math.round(result.totals.carbs)}g ${Math.round(result.totals.cal)}kcal`,
      `📋 買い物リスト:`,
      ...result.items.map(i => `  ${i.name} ×${i.servings} (¥${i.cost * i.servings})`),
      `\n💪 マクロ飯ビルダーで最適化`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => { setShareMsg("✅ コピーしました！"); setTimeout(() => setShareMsg(""), 2000); });
  };

  const ppYen = result ? (result.totals.protein / result.totals.cost * 100).toFixed(1) : 0;

  const profileSummary = [
    gender === "female" ? "♀" : "♂", `${weight}kg`,
    height ? `${height}cm` : null, bmi ? `BMI${bmi}` : null,
    bodyFat ? `BF${bodyFat}%` : null, age ? `${age}歳` : null,
    goalWeight ? `→${goalWeight}kg` : null,
    ({ reduce: "減量", bulk: "増量", maintain: "維持" })[goal],
  ].filter(Boolean).join(" ");

  const idealPFC = goal === "reduce" ? { p: "40-50%", f: "20-30%", c: "20-30%" } : goal === "bulk" ? { p: "25-35%", f: "20-30%", c: "40-50%" } : { p: "25-35%", f: "25-35%", c: "40-50%" };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)", fontFamily: "'DM Sans','Noto Sans JP',sans-serif", color: "white", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle,rgba(34,197,94,0.06)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -150, left: -150, width: 400, height: 400, background: "radial-gradient(circle,rgba(59,130,246,0.05)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      {/* Fonts loaded via layout.js */}

      {/* Header */}
      <header style={{ padding: "18px 24px 10px", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }}>💪</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, background: "linear-gradient(135deg,#22c55e,#4ade80)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>マクロ飯ビルダー</h1>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", margin: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>AI Macro × Budget Optimizer</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} style={{
              padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
              background: showHistory ? "rgba(168,139,250,0.1)" : "transparent",
              color: showHistory ? "#c4b5fd" : "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer", transition: "all 0.2s",
            }}>📜 履歴</button>
          )}
          {user && (
            <a href="/record" style={{
              padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)",
              background: "rgba(34,197,94,0.1)", color: "#4ade80", fontSize: 11,
              cursor: "pointer", transition: "all 0.2s", textDecoration: "none", fontWeight: 600,
            }}>📝 記録</a>
          )}
          {user && (
            <a href="/settings" style={{
              padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 11,
              cursor: "pointer", transition: "all 0.2s", textDecoration: "none",
            }}>⚙️</a>
          )}
          <AuthGate supabase={supabase} onAuthChange={handleAuthChange} />
        </div>
      </header>

      <main style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" }}>

        {/* History panel */}
        {showHistory && history.length > 0 && (
          <div style={{ background: "rgba(168,139,250,0.05)", border: "1px solid rgba(168,139,250,0.12)", borderRadius: 16, padding: "14px 16px", marginBottom: 14, animation: "fadeUp 0.3s ease-out" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#c4b5fd", marginBottom: 10 }}>📜 過去のプラン</div>
            {history.slice(0, 5).map((h, i) => (
              <div key={h.id || i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i < Math.min(history.length, 5) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{h.date}</span>
                <span style={{ color: "rgba(255,255,255,0.6)" }}>{h.weight}kg {({ reduce: "減量", bulk: "増量", maintain: "維持" })[h.goal]}</span>
                <span style={{ fontFamily: "'Space Mono',monospace", color: "#4ade80" }}>P{h.protein}g ¥{h.cost}</span>
              </div>
            ))}
          </div>
        )}

        {/* STEP 1: PROFILE */}
        <SectionCard num="1" title="プロフィール" summary={profileSummary}
          collapsed={step === "result"} onToggle={() => setStep("params")}>

          {/* Gender */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>👤 性別</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "male", label: "男性", emoji: "♂️" }, { id: "female", label: "女性", emoji: "♀️" }].map(g => (
                <button key={g.id} onClick={() => setGender(g.id)} aria-label={`性別: ${g.label}`} aria-pressed={gender === g.id} role="radio" style={{
                  flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                  border: gender === g.id ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: gender === g.id ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
                  color: gender === g.id ? "#4ade80" : "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600,
                }}>{g.emoji} {g.label}</button>
              ))}
            </div>
          </div>

          {/* Weight — 小数第2位対応、スライダー廃止 → ±ステッパー */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>⚖️ 体重</label>
              <StepperInput value={weight} onChange={setWeight}
                min={30} max={200} inputStep={0.01} step={0.1} bigStep={0.1} suffix="kg" width={75} color="#22c55e" />
            </div>
            {errors.weight && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4, textAlign: "right" }}>{errors.weight}</div>}
          </div>

          {/* Goal */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>🎯 目的</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "reduce", label: "減量", emoji: "🔥", desc: "体脂肪を落とす" }, { id: "maintain", label: "維持", emoji: "⚖️", desc: "現状キープ" }, { id: "bulk", label: "増量", emoji: "💪", desc: "筋肉をつける" }].map(g => (
                <button key={g.id} onClick={() => { setGoal(g.id); setErrors(p => ({ ...p, goalWeight: undefined })); }} aria-label={`目的: ${g.label} - ${g.desc}`} aria-pressed={goal === g.id} role="radio" style={{
                  flex: 1, padding: "11px 6px", borderRadius: 12, cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                  border: goal === g.id ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: goal === g.id ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 3 }}>{g.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: goal === g.id ? "#4ade80" : "rgba(255,255,255,0.7)" }}>{g.label}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>🏃 活動レベル</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "low", label: "低い", desc: "デスクワーク" }, { id: "moderate", label: "普通", desc: "週2-3回運動" }, { id: "high", label: "高い", desc: "毎日運動" }].map(a => (
                <button key={a.id} onClick={() => setActivity(a.id)} aria-label={`活動レベル: ${a.label} - ${a.desc}`} aria-pressed={activity === a.id} role="radio" style={{
                  flex: 1, padding: "9px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all 0.2s",
                  border: activity === a.id ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: activity === a.id ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: activity === a.id ? "#60a5fa" : "rgba(255,255,255,0.55)" }}>{a.label}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional section — 常時展開、任意であることを視覚的に伝える */}
          <div style={{
            marginTop: 8, padding: "14px 16px", borderRadius: 14,
            background: "rgba(168,139,250,0.03)", border: "1px dashed rgba(168,139,250,0.15)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(168,139,250,0.7)", marginBottom: 14 }}>
              💡 より正確な分析のためのオプション（任意）
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>📏 身長</label>
              <NumInput value={height} onChange={setHeight} placeholder="170" suffix="cm" min={100} max={220} step={0.1} width={60} color="#60a5fa" />
            </div>
            {errors.height && <div style={{ fontSize: 11, color: "#ef4444", marginTop: -10, marginBottom: 10, textAlign: "right" }}>{errors.height}</div>}
            {bmi && (
              <div style={{ padding: "10px 14px", borderRadius: 11, marginBottom: 14, background: `${bmiCol}08`, border: `1px solid ${bmiCol}20`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>📊 BMI</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: bmiCol }}>{bmi}</span>
                  <span style={{ fontSize: 10, color: bmiCol, background: `${bmiCol}18`, padding: "2px 7px", borderRadius: 5 }}>{bmiCat}</span>
                </div>
              </div>
            )}
            {/* 体脂肪率 — 小数第1位対応、±ステッパー */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>📉 体脂肪率</label>
              <StepperInput value={bodyFat} onChange={setBodyFat}
                min={3} max={60} inputStep={0.1} step={0.1} bigStep={0.1} suffix="%" width={55} color="#f97316" />
            </div>
            {errors.bodyFat && <div style={{ fontSize: 11, color: "#ef4444", marginTop: -10, marginBottom: 10, textAlign: "right" }}>{errors.bodyFat}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>🎂 年齢</label>
              <NumInput value={age} onChange={setAge} placeholder="30" suffix="歳" min={10} max={120} step={1} width={50} color="#a78bfa" />
            </div>
            {errors.age && <div style={{ fontSize: 11, color: "#ef4444", marginTop: -10, marginBottom: 10, textAlign: "right" }}>{errors.age}</div>}

            {/* ── 目標体重 & 期限 ── */}
            <div style={{ marginTop: 4, marginBottom: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(251,191,36,0.03)", border: "1px solid rgba(251,191,36,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>🎯 目標体重</label>
                <StepperInput value={goalWeight} onChange={setGoalWeight}
                  min={20} max={200} inputStep={0.1} step={0.5} bigStep={1} suffix="kg" width={70} color="#fbbf24" />
              </div>
              {errors.goalWeight && <div style={{ fontSize: 11, color: "#ef4444", marginTop: -8, marginBottom: 8, textAlign: "right" }}>{errors.goalWeight}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: daysLeft ? 8 : 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>🗓️ 目標期限</label>
                <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} min={new Date().toISOString().split("T")[0]}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 10px", color: deadline ? "#fbbf24" : "rgba(255,255,255,0.25)", fontFamily: "'Space Mono',monospace", fontSize: 13, outline: "none", colorScheme: "dark" }} />
              </div>
              {daysLeft > 0 && (
                <div style={{ padding: "9px 14px", borderRadius: 10, marginTop: 6, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.1)", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  ⏳ 残り <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 700, color: "#fbbf24" }}>{daysLeft}</span> 日
                  {goalWeight && weight && daysLeft > 0 && (() => {
                    const diff = goalWeight - weight;
                    const weeklyKg = (diff / daysLeft * 7).toFixed(2);
                    return <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>({weeklyKg > 0 ? "+" : ""}{weeklyKg}kg/週ペース)</span>;
                  })()}
                </div>
              )}
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, marginTop: 10 }}>
                💡 目標体重と期限を設定すると、AIが1日あたりの最適なカロリー増減ペースを正確に逆算します
              </div>
            </div>
          </div>

          {step === "profile" && (
            <button onClick={() => { if (!validate()) return; setStep("params"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100); }} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none", marginTop: 18,
              background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "white", fontSize: 15, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 8px 32px rgba(34,197,94,0.25)", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: 1,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}>次へ →</button>
          )}
        </SectionCard>

        {/* STEP 2: PARAMS */}
        {(step === "params" || step === "result") && (
          <SectionCard num="2" title="予算 & 栄養目標" summary={`¥${budget} P${protein}g ${calories}kcal`}
            collapsed={step === "result"} onToggle={() => setStep("params")} color="#60a5fa" bgColor="rgba(59,130,246,0.15)">

            {calcBasis && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", lineHeight: 1.5 }}>
                📐 {calcBasis}
              </div>
            )}

            <SliderInput label="🪙 食費予算/日" value={budget} setValue={setBudget} min={200} max={5000} step={50} color="#22c55e" prefix="¥" editable />
            <SliderInput label="🥩 目標タンパク質" value={protein} setValue={setProtein} min={50} max={250} step={5} color="#f97316" suffix="g" editable />
            <SliderInput label="🔥 目標カロリー" value={calories} setValue={setCalories} min={1000} max={4000} step={50} color="#3b82f6" suffix="kcal" editable />

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", display: "block", marginBottom: 8 }}>⚙️ カテゴリ除外</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["meat", "fish", "dairy", "soy", "supp"].map(cat => (
                  <Pill key={cat} active={excludedCats.includes(cat)} onClick={() => setExcludedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}>
                    {CAT_EMOJI[cat]} {CAT_LABELS[cat]}なし
                  </Pill>
                ))}
              </div>
            </div>

            <button onClick={() => setShowFoodPicker(!showFoodPicker)} style={{
              width: "100%", padding: "9px 14px", borderRadius: 10, cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)",
              color: "rgba(255,255,255,0.4)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: showFoodPicker ? 10 : 16, transition: "all 0.2s",
            }}>
              <span>🚫 個別に食材を除外 {excludedIds.length > 0 && `(${excludedIds.length}件)`}</span>
              <span style={{ fontSize: 10, transform: showFoodPicker ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
            </button>

            {showFoodPicker && (
              <div style={{ marginBottom: 16, maxHeight: 200, overflowY: "auto", background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                {FOOD_DB.filter(f => !excludedCats.includes(f.cat)).map(f => (
                  <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer", fontSize: 12, color: excludedIds.includes(f.id) ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <input type="checkbox" checked={excludedIds.includes(f.id)}
                      onChange={() => setExcludedIds(prev => prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id])}
                      style={{ accentColor: "#ef4444", width: 14, height: 14 }} />
                    <span style={{ textDecoration: excludedIds.includes(f.id) ? "line-through" : "none" }}>{CAT_EMOJI[f.cat]} {f.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>P{f.protein}g ¥{f.cost}</span>
                  </label>
                ))}
              </div>
            )}

            <button onClick={handleGenerate} disabled={aiLoading || !weight} style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none", minHeight: 52,
              background: (aiLoading || !weight) ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "white", fontSize: 16, fontWeight: 700, cursor: (aiLoading || !weight) ? "not-allowed" : "pointer",
              boxShadow: aiLoading ? "none" : "0 8px 32px rgba(34,197,94,0.3)", fontFamily: "'Noto Sans JP',sans-serif", letterSpacing: 1,
              transition: "transform 0.15s, box-shadow 0.15s, opacity 0.2s",
            }}>
              {aiLoading ? <span>🧠 AI分析中 <TypingDots /></span> : "⚡ AIプランを生成"}
            </button>
          </SectionCard>
        )}

        {/* RESULTS */}
        {step === "result" && result && (
          <div ref={resultRef} style={{ animation: "fadeUp 0.5s ease-out" }}>
            <div style={{
              padding: "13px 16px", borderRadius: 14, marginBottom: 14,
              background: result.proteinReached ? "linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.04))" : "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.04))",
              border: `1px solid ${result.proteinReached ? "rgba(34,197,94,0.18)" : "rgba(249,115,22,0.18)"}`, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{result.proteinReached ? "✅" : "⚠️"}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{result.proteinReached ? "目標達成！" : "タンパク質が少し不足"}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>¥{Math.round(result.totals.cost)}/¥{budget} — 残¥{Math.round(result.remaining)}{daysLeft ? ` — ${daysLeft}日` : ""}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "18px 6px 14px", marginBottom: 14 }}>
              <MacroRing label="タンパク質" value={result.totals.protein} max={protein} color="#f97316" unit="g" ideal={protein} />
              <MacroRing label="脂質" value={result.totals.fat} max={Math.max(result.totals.fat, calories * 0.3 / 9)} color="#a78bfa" unit="g" />
              <MacroRing label="炭水化物" value={result.totals.carbs} max={Math.max(result.totals.carbs, calories * 0.5 / 4)} color="#3b82f6" unit="g" />
              <MacroRing label="カロリー" value={result.totals.cal} max={calories} color="#22c55e" unit="kcal" ideal={calories} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1, padding: "12px", borderRadius: 13, background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>P効率</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: "#f97316" }}>{ppYen}g<span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>/¥100</span></div>
              </div>
              <div style={{ flex: 1.5, padding: "12px", borderRadius: 13, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>PFC比率</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, color: "#3b82f6" }}>
                  {Math.round(result.totals.protein * 4 / result.totals.cal * 100)} : {Math.round(result.totals.fat * 9 / result.totals.cal * 100)} : {Math.round(result.totals.carbs * 4 / result.totals.cal * 100)}
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>理想 P{idealPFC.p} F{idealPFC.f} C{idealPFC.c}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 3, marginBottom: 14, background: "rgba(255,255,255,0.03)", borderRadius: 11, padding: 3 }}>
              {[{ id: "ai", label: `🧠 AI献立${aiLoading ? "..." : ""}` }, { id: "plan", label: "🛒 買い物" }, { id: "tips", label: "💡 Tips" }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, padding: "9px 6px", borderRadius: 9, border: "none",
                  background: activeTab === tab.id ? "rgba(34,197,94,0.15)" : "transparent",
                  color: activeTab === tab.id ? "#4ade80" : "rgba(255,255,255,0.35)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Noto Sans JP',sans-serif",
                }}>{tab.label}</button>
              ))}
            </div>

            {/* AI Tab */}
            {activeTab === "ai" && (
              <div>
                {aiLoading && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "28px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 2s infinite" }}>🧠</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>AIが献立を考え中...</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{profileSummary} <TypingDots /></div>
                  </div>
                )}
                {aiError && (
                  <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 14, padding: "14px 16px" }}>
                    <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.5 }}>⚠️ {aiError}</div>
                    <button onClick={handleGenerate} style={{ marginTop: 8, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: 11, cursor: "pointer" }}>再試行</button>
                  </div>
                )}
                {aiAdvice && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ background: "linear-gradient(135deg,rgba(34,197,94,0.07),rgba(59,130,246,0.05))", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 15, padding: "16px" }}>
                      <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, marginBottom: 7 }}>🤖 AIパーソナルコーチ</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.75 }}><StreamText text={aiAdvice.personalMessage} /></div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>👨‍🍳 本日の献立</div>
                    {aiAdvice.meals?.map((meal, i) => {
                      const bg = ["rgba(249,115,22,0.1)", "rgba(34,197,94,0.1)", "rgba(59,130,246,0.1)", "rgba(168,139,250,0.1)"];
                      const fb = ["🌅", "☀️", "🌙", "🍎"];
                      return (
                        <div key={i} onClick={() => setExpandedMeal(expandedMeal === i ? null : i)} style={{
                          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 15, overflow: "hidden", cursor: "pointer", animation: `fadeUp 0.3s ease-out ${i * 0.07}s both`,
                        }}>
                          <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 11 }}>
                            <div style={{ minWidth: 42, height: 42, borderRadius: 12, background: bg[i % 4], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{meal.emoji || fb[i % 4]}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{meal.timing}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 1 }}>{meal.name}</div>
                              {meal.macros && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2, fontFamily: "'Space Mono',monospace" }}>{meal.macros}</div>}
                            </div>
                            <span style={{ transform: expandedMeal === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>▼</span>
                          </div>
                          {expandedMeal === i && (
                            <div style={{ padding: "0 16px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 12 }}>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}><span style={{ color: "#4ade80", fontWeight: 600 }}>🛒</span> {meal.ingredients}</div>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}><span style={{ color: "#60a5fa", fontWeight: 600 }}>📝</span> {meal.recipe}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {aiAdvice.weeklyTip && (
                      <div style={{ background: "rgba(168,139,250,0.05)", border: "1px solid rgba(168,139,250,0.1)", borderRadius: 14, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, color: "#c4b5fd", fontWeight: 600, marginBottom: 5 }}>📅 週間アドバイス</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{aiAdvice.weeklyTip}</div>
                      </div>
                    )}
                    {aiAdvice.warning && (
                      <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", borderRadius: 14, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 600, marginBottom: 5 }}>⚠️ 注意</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{aiAdvice.warning}</div>
                      </div>
                    )}
                    {aiAdvice.productTips && (
                      <div style={{ background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 14, padding: "14px 16px" }}>
                        <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, marginBottom: 5 }}>🎯 あなたへのおすすめ</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{aiAdvice.productTips}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Shopping Tab */}
            {activeTab === "plan" && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden" }}>
                {result.items.map((item, i) => (
                  <div key={i} style={{ padding: "12px 16px", borderBottom: i < result.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", animation: `fadeUp 0.25s ease-out ${i * 0.03}s both` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{CAT_EMOJI[item.cat]} {item.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{item.unit} × {item.servings} — P:{(item.protein * item.servings).toFixed(1)}g</div>
                    </div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>¥{item.cost * item.servings}</div>
                  </div>
                ))}
                <div style={{ padding: "14px 16px", background: "rgba(34,197,94,0.04)", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>合計 ({result.items.length}品)</span>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 17, fontWeight: 700, color: "#22c55e" }}>¥{Math.round(result.totals.cost)}</span>
                </div>
              </div>
            )}

            {/* Tips Tab */}
            {activeTab === "tips" && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px" }}>
                {[
                  { emoji: "🏪", title: "業務スーパー活用", desc: "鶏むね2kg ¥900〜、冷凍ブロッコリー500g ¥150〜" },
                  { emoji: "🥚", title: "卵は最強コスパ", desc: "10個¥200前後。1個¥20でP6gの完全栄養食" },
                  { emoji: "📅", title: "下味冷凍で時短", desc: "鶏むねに味付けして冷凍→解凍して焼くだけ" },
                  { emoji: "🏷️", title: "20時以降は値引き品", desc: "肉・魚が30-50%OFF。タイムセールを狙う" },
                  { emoji: "💊", title: "プロテインはコスパ◎", desc: "1杯¥50〜60でP20g。朝食・間食の置き換えに" },
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{tip.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{tip.title}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{tip.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Affiliate */}
            <div style={{ marginTop: 16, padding: "16px", borderRadius: 15, background: "linear-gradient(135deg,rgba(139,92,246,0.06),rgba(59,130,246,0.04))", border: "1px solid rgba(139,92,246,0.12)" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: 1 }}>💎 おすすめ</div>
              {[
                { name: "マイプロテイン ホエイ 1kg", price: "¥3,390", tag: "1杯¥56でP21g", color: "#f97316" },
                { name: "タニタ キッチンスケール", price: "¥1,480", tag: "計量で無駄ゼロ", color: "#3b82f6" },
                { name: "iwaki 耐熱保存容器セット", price: "¥2,780", tag: "作り置きの必需品", color: "#22c55e" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{item.name}</div>
                    <span style={{ fontSize: 9, color: item.color, background: `${item.color}12`, padding: "1px 6px", borderRadius: 4 }}>{item.tag}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "'Space Mono',monospace" }}>{item.price}</div>
                </div>
              ))}
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 8, textAlign: "center" }}>※ アフィリエイトリンクを含みます</div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={handleGenerate} disabled={aiLoading} style={{
                flex: 1, padding: "14px", borderRadius: 13, border: "1px solid rgba(34,197,94,0.25)",
                background: "rgba(34,197,94,0.06)", color: "#4ade80", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: aiLoading ? 0.5 : 1,
                minHeight: 48, transition: "all 0.15s",
              }}>🔄 再生成</button>
              <button onClick={handleShare} style={{
                flex: 1, padding: "14px", borderRadius: 13, border: "1px solid rgba(255,255,255,0.1)",
                background: shareMsg ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                color: shareMsg ? "#4ade80" : "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                minHeight: 48,
              }}>{shareMsg || "📤 シェア"}</button>
            </div>
          </div>
        )}
      </main>

      <style>{`
        html{scroll-behavior:smooth}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes dotPulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.3),0 0 0 3px rgba(34,197,94,0.18);cursor:pointer}
        input[type="range"]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;border:none;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer}
        input[type="number"]::-webkit-inner-spin-button,input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
        input[type="number"]{-moz-appearance:textfield}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        button{-webkit-tap-highlight-color:transparent;touch-action:manipulation}
        button:active{transform:scale(0.97)}
        button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid rgba(74,222,128,0.6);outline-offset:2px;border-radius:8px}
        [role="radio"]:focus-visible{outline:2px solid rgba(74,222,128,0.6);outline-offset:2px}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>
    </div>
  );
}

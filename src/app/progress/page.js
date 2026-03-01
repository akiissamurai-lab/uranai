"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveBodyMetric, loadBodyMetrics, loadBodyMetricByDate, loadProfile, loadTrainingLogsRange, loadMealLogsRange, isDbError } from "@/lib/db";
import { saveLocalBodyMetric, loadLocalBodyMetrics, loadLocalBodyMetricByDate, loadLocalProfile, loadLocalTrainingLogsRange, loadLocalMealLogsRange } from "@/lib/local-db";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { PenLine, Scale, Dumbbell, Star, ChevronDown, Target, TrendingDown, TrendingUp, Minus } from "lucide-react";

const BODY_PART_LABELS = {
  chest: { label: "胸", color: "#f87171" },
  back: { label: "背中", color: "#60a5fa" },
  shoulders: { label: "肩", color: "#fbbf24" },
  arms: { label: "腕", color: "#a78bfa" },
  legs: { label: "脚", color: "#4ade80" },
  abs: { label: "腹", color: "#f472b6" },
  cardio: { label: "有酸素", color: "#22d3ee" },
};

const tooltipLabels = { weight: "朝(体重)", weightNight: "夜(体重)", weightMA7: "7日平均(体重)", bodyFat: "朝(体脂肪)", bodyFatNight: "夜(体脂肪)", bodyFatMA7: "7日平均(体脂肪)" };
const tooltipUnits = { weight: "kg", weightNight: "kg", weightMA7: "kg", bodyFat: "%", bodyFatNight: "%", bodyFatMA7: "%" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,15,30,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 140 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{label}</div>
      {payload.map((p, idx) => (
        <div key={p.dataKey || idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{tooltipLabels[p.dataKey] || p.dataKey}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "var(--font-mono)", marginLeft: "auto" }}>
            {p.value}{tooltipUnits[p.dataKey] || ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }

export default function ProgressPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);
  const [toast, setToast] = useState(null);

  // Form
  const [date, setDate] = useState(today());
  const [formTab, setFormTab] = useState("morning");
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [nightWeight, setNightWeight] = useState("");
  const [nightBodyFat, setNightBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);

  // Chart data
  const [metrics, setMetrics] = useState([]);
  const [range, setRange] = useState(30);
  const [chartMode, setChartMode] = useState("weight"); // "weight" | "fat"
  const [goalWeight, setGoalWeight] = useState(null);

  // Weekly review
  const [weeklyMealLogs, setWeeklyMealLogs] = useState([]);
  const [startWeight, setStartWeight] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(null);
  const [proteinGoal, setProteinGoal] = useState(null);
  const [fatGoal, setFatGoal] = useState(null);
  const [carbsGoal, setCarbsGoal] = useState(null);
  const [budgetGoal, setBudgetGoal] = useState(null);

  // Training stats
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [trainingOpen, setTrainingOpen] = useState(false);

  useEffect(() => {
    const authTimeout = setTimeout(() => { setLoading(false); }, 5000);
    supabase.auth.getUser().then(({ data: { user } }) => {
      clearTimeout(authTimeout);
      setUser(user);
      setLoading(false);
    }).catch(() => { clearTimeout(authTimeout); setLoading(false); });
    return () => clearTimeout(authTimeout);
  }, [supabase]);

  useEffect(() => {
    if (loading) return;
    const applyProfile = (p) => {
      if (!p) return;
      if (p.goal_weight) setGoalWeight(Number(p.goal_weight));
      if (p.weight) setStartWeight(Number(p.weight));
      if (p.calorie_goal) setCalorieGoal(Number(p.calorie_goal));
      if (p.protein_goal) setProteinGoal(Number(p.protein_goal));
      if (p.fat_goal) setFatGoal(Number(p.fat_goal));
      if (p.carbs_goal) setCarbsGoal(Number(p.carbs_goal));
      if (p.budget) setBudgetGoal(Number(p.budget));
    };
    if (user) { loadProfile(supabase, user.id).then(applyProfile); }
    else { applyProfile(loadLocalProfile()); }
  }, [user, loading, supabase]);

  useEffect(() => {
    if (loading) return;
    if (user) { loadBodyMetrics(supabase, user.id, range || 3650).then(r => { setMetrics(r); if (r._error) showToast("error", "体重データの取得に失敗: " + r._error); }); }
    else { setMetrics(loadLocalBodyMetrics(range || 3650)); }
  }, [supabase, user, range, loading]);

  useEffect(() => {
    if (loading) return;
    if (user) { loadTrainingLogsRange(supabase, user.id, 30).then(r => { setTrainingLogs(r); if (r._error) showToast("error", "筋トレデータの取得に失敗: " + r._error); }); }
    else { setTrainingLogs(loadLocalTrainingLogsRange(30)); }
  }, [supabase, user, loading]);

  // Weekly meal logs for review
  useEffect(() => {
    if (loading) return;
    if (user) { loadMealLogsRange(supabase, user.id, 7).then(r => { setWeeklyMealLogs(r); if (r._error) showToast("error", "食事データの取得に失敗: " + r._error); }); }
    else { setWeeklyMealLogs(loadLocalMealLogsRange(7)); }
  }, [supabase, user, loading]);

  useEffect(() => {
    if (loading) return;
    const apply = (m) => {
      if (m) {
        setWeight(m.weight != null ? String(m.weight) : "");
        setBodyFat(m.body_fat != null ? String(m.body_fat) : "");
        setNightWeight(m.weight_night != null ? String(m.weight_night) : "");
        setNightBodyFat(m.body_fat_night != null ? String(m.body_fat_night) : "");
        setNotes(m.notes || "");
        if (m.notes) setNotesOpen(true);
        setWeightSaved(m.weight != null || m.weight_night != null);
      } else {
        setWeight(""); setBodyFat(""); setNightWeight(""); setNightBodyFat(""); setNotes("");
        setNotesOpen(false);
        setWeightSaved(false);
      }
    };
    if (user) { loadBodyMetricByDate(supabase, user.id, date).then(apply); }
    else { apply(loadLocalBodyMetricByDate(date)); }
  }, [supabase, user, date, loading]);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 2500); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weight && !nightWeight) return;
    setSaving(true);
    const metricData = {
      date,
      weight: weight !== "" ? Number(weight) : null,
      bodyFat: bodyFat !== "" ? Number(bodyFat) : null,
      weightNight: nightWeight !== "" ? Number(nightWeight) : null,
      bodyFatNight: nightBodyFat !== "" ? Number(nightBodyFat) : null,
      notes: notes.trim() || null,
    };
    let ok;
    if (user) { ok = await saveBodyMetric(supabase, user.id, metricData); }
    else { ok = saveLocalBodyMetric(metricData); }
    setSaving(false);
    if (isDbError(ok)) {
      showToast("error", "保存に失敗: " + ok._error);
    } else if (ok) {
      showToast("success", "保存しました");
      setWeightSaved(true);
      if (user) { loadBodyMetrics(supabase, user.id, range || 3650).then(setMetrics); }
      else { setMetrics(loadLocalBodyMetrics(range || 3650)); }
    } else { showToast("error", "保存に失敗しました"); }
  };

  // Chart data
  const chartData = metrics.map((m) => ({
    date: m.date,
    label: `${new Date(m.date + "T00:00").getMonth() + 1}/${new Date(m.date + "T00:00").getDate()}`,
    weight: m.weight != null ? Number(m.weight) : null,
    weightNight: m.weight_night != null ? Number(m.weight_night) : null,
    bodyFat: m.body_fat != null ? Number(m.body_fat) : null,
    bodyFatNight: m.body_fat_night != null ? Number(m.body_fat_night) : null,
  }));

  // 7-day moving average
  const chartDataWithMA = chartData.map((d, i) => {
    const win = chartData.slice(Math.max(0, i - 6), i + 1);
    const ws = win.filter(w => w.weight != null).map(w => w.weight);
    const bfs = win.filter(w => w.bodyFat != null).map(w => w.bodyFat);
    return {
      ...d,
      weightMA7: ws.length >= 3 ? +(ws.reduce((a, b) => a + b, 0) / ws.length).toFixed(2) : null,
      bodyFatMA7: bfs.length >= 3 ? +(bfs.reduce((a, b) => a + b, 0) / bfs.length).toFixed(1) : null,
    };
  });

  const morningWeights = chartData.filter(d => d.weight != null).map(d => d.weight);
  const nightWeights = chartData.filter(d => d.weightNight != null).map(d => d.weightNight);
  const fats = chartData.filter(d => d.bodyFat != null).map(d => d.bodyFat);
  const nightFats = chartData.filter(d => d.bodyFatNight != null).map(d => d.bodyFatNight);
  const allWeights = [...morningWeights, ...nightWeights, ...(goalWeight ? [goalWeight] : [])];
  const wMin = allWeights.length ? Math.floor(Math.min(...allWeights) - 1) : 50;
  const wMax = allWeights.length ? Math.ceil(Math.max(...allWeights) + 1) : 80;
  const allFats = [...fats, ...nightFats];
  const fMin = allFats.length ? Math.floor(Math.min(...allFats) - 2) : 5;
  const fMax = allFats.length ? Math.ceil(Math.max(...allFats) + 2) : 30;
  const hasNightWeight = nightWeights.length > 0;
  const hasNightFat = nightFats.length > 0;
  const hasFatData = fats.length > 0;

  // Goal prediction
  const goalPrediction = (() => {
    if (!goalWeight || morningWeights.length < 3) return null;
    const latestW = morningWeights[morningWeights.length - 1];
    const remaining = +(latestW - goalWeight).toFixed(1);
    const recentData = chartData.filter(d => d.weight != null).slice(-14);
    if (recentData.length < 3) return null;
    const n = recentData.length;
    const xMean = (n - 1) / 2;
    const yMean = recentData.reduce((s, d) => s + d.weight, 0) / n;
    const num = recentData.reduce((s, d, i) => s + (i - xMean) * (d.weight - yMean), 0);
    const den = recentData.reduce((s, _, i) => s + (i - xMean) ** 2, 0);
    const slope = den !== 0 ? num / den : 0;
    const weeklyRate = +(slope * 7).toFixed(2);
    const movingToward = (remaining > 0 && slope < -0.01) || (remaining < 0 && slope > 0.01);
    if (!movingToward || Math.abs(slope) < 0.01) return { remaining: Math.abs(remaining), weekly: weeklyRate, eta: null };
    const days = Math.abs(remaining / slope);
    const eta = new Date(); eta.setDate(eta.getDate() + Math.round(days));
    return { remaining: Math.abs(remaining), weekly: weeklyRate, eta: `${eta.getFullYear()}年${eta.getMonth() + 1}月` };
  })();

  // Goal progress bar
  const goalProgress = (() => {
    if (!goalWeight) return null;
    const latestW = morningWeights.length > 0 ? morningWeights[morningWeights.length - 1] : null;
    const effectiveStart = startWeight || (morningWeights.length > 0 ? morningWeights[0] : null);
    if (!latestW || !effectiveStart) return { hasData: false };
    const totalToLose = effectiveStart - goalWeight;
    const lost = effectiveStart - latestW;
    const pct = totalToLose !== 0 ? Math.min(100, Math.max(0, (lost / totalToLose) * 100)) : 100;
    const remaining = Math.abs(+(latestW - goalWeight).toFixed(1));
    return { hasData: true, pct: +pct.toFixed(1), remaining, latestW, effectiveStart };
  })();

  // Weekly review
  const weeklyReview = (() => {
    const dailyCals = {};
    for (const log of weeklyMealLogs) {
      const d = log.date;
      const cal = ((log.protein || 0) * 4) + ((log.fat || 0) * 9) + ((log.carbs || 0) * 4);
      dailyCals[d] = (dailyCals[d] || 0) + cal;
    }
    const days = Object.keys(dailyCals);
    const daysWithData = days.length;
    if (daysWithData < 1) return null;

    const totalCal = Object.values(dailyCals).reduce((a, b) => a + b, 0);
    const avgCal = Math.round(totalCal / daysWithData);

    // Weight change over 7 days
    const recentMetrics = metrics.filter(m => {
      const d = new Date(m.date + "T00:00");
      const ago = new Date(); ago.setDate(ago.getDate() - 8);
      return d >= ago && m.weight != null;
    });
    let weightChange = null;
    let weightFrom = null;
    let weightTo = null;
    if (recentMetrics.length >= 2) {
      weightFrom = Number(recentMetrics[0].weight);
      weightTo = Number(recentMetrics[recentMetrics.length - 1].weight);
      weightChange = +(weightTo - weightFrom).toFixed(1);
    }

    // Rule-based feedback
    let feedback = { icon: "", text: "" };
    const calUnder = calorieGoal ? avgCal <= calorieGoal : null;

    if (daysWithData < 2) {
      feedback = { icon: "📝", text: "データが増えると分析精度が上がるよ。毎日記録しよう！" };
    } else if (weightChange !== null && calUnder !== null) {
      if (weightChange < -0.1 && calUnder) {
        feedback = { icon: "🔥", text: "いいペース！カロリー管理と体重減少が一致してる" };
      } else if (Math.abs(weightChange) <= 0.1 && calUnder) {
        feedback = { icon: "💪", text: "カロリーは抑えてる。体重は遅れて反映されるから継続！" };
      } else if (weightChange > 0.1 && !calUnder) {
        feedback = { icon: "⚠️", text: "カロリーオーバー気味。食事内容を見直してみよう" };
      } else if (weightChange < -0.1 && !calUnder) {
        feedback = { icon: "🤔", text: "体重は減ってるけどカロリーオーバー。運動効果かも？" };
      } else if (weightChange > 0.1 && calUnder) {
        feedback = { icon: "🧐", text: "カロリーは抑えてるのに増加。水分変動かも。長期トレンドを見よう" };
      } else {
        feedback = { icon: "📊", text: "安定してる。このペースを維持しよう" };
      }
    } else if (weightChange !== null) {
      if (weightChange < -0.1) feedback = { icon: "📉", text: `${Math.abs(weightChange)}kg減。いい調子！` };
      else if (weightChange > 0.1) feedback = { icon: "📈", text: `${weightChange}kg増。食事を振り返ってみよう` };
      else feedback = { icon: "➡️", text: "体重は安定。現状維持中" };
    } else if (calUnder !== null) {
      feedback = calUnder
        ? { icon: "✅", text: "カロリー目標内。この調子！" }
        : { icon: "⚠️", text: `平均${avgCal - calorieGoal}kcalオーバー。少し調整しよう` };
    } else {
      feedback = { icon: "ℹ️", text: "ホーム画面でカロリー目標を設定すると比較できます" };
    }

    return { avgCal, daysWithData, weightChange, weightFrom, weightTo, feedback };
  })();

  // Weekly summary (for the summary card)
  const weeklySummary = (() => {
    if (weeklyMealLogs.length < 1) return null;

    const dates = [...new Set(weeklyMealLogs.map(l => l.date))].sort();
    const daysWithData = dates.length;

    // PFC & cost per day
    const dailyPFC = {};
    const dailyCost = {};
    for (const log of weeklyMealLogs) {
      const d = log.date;
      if (!dailyPFC[d]) dailyPFC[d] = { p: 0, f: 0, c: 0 };
      dailyPFC[d].p += (log.protein || 0);
      dailyPFC[d].f += (log.fat || 0);
      dailyPFC[d].c += (log.carbs || 0);
      dailyCost[d] = (dailyCost[d] || 0) + (log.price || 0);
    }

    const avgP = Math.round(Object.values(dailyPFC).reduce((s, d) => s + d.p, 0) / daysWithData);
    const avgF = Math.round(Object.values(dailyPFC).reduce((s, d) => s + d.f, 0) / daysWithData);
    const avgC = Math.round(Object.values(dailyPFC).reduce((s, d) => s + d.c, 0) / daysWithData);

    const pRate = proteinGoal ? Math.min(100, Math.round((avgP / proteinGoal) * 100)) : null;
    const fRate = fatGoal ? Math.min(100, Math.round((avgF / fatGoal) * 100)) : null;
    const cRate = carbsGoal ? Math.min(100, Math.round((avgC / carbsGoal) * 100)) : null;

    const totalSpent = Object.values(dailyCost).reduce((a, b) => a + b, 0);
    const totalBudget = budgetGoal ? budgetGoal * daysWithData : null;
    const savings = totalBudget != null ? totalBudget - totalSpent : null;

    return {
      daysWithData,
      dateFrom: dates[0],
      dateTo: dates[dates.length - 1],
      avgP, avgF, avgC,
      pRate, fRate, cRate,
      totalSpent, savings,
      weightChange: weeklyReview?.weightChange ?? null,
      weightFrom: weeklyReview?.weightFrom ?? null,
      weightTo: weeklyReview?.weightTo ?? null,
      avgCal: weeklyReview?.avgCal ?? null,
    };
  })();

  // Training stats
  const trainingWeekCount = (() => {
    const w = new Date(); w.setDate(w.getDate() - 7);
    return trainingLogs.filter(t => t.date >= w.toISOString().slice(0, 10)).length;
  })();
  const bodyPartCounts = (() => {
    const c = {};
    for (const tl of trainingLogs) { for (const p of (tl.body_parts || [])) { c[p] = (c[p] || 0) + 1; } }
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  })();
  const maxBPC = bodyPartCounts.length > 0 ? bodyPartCounts[0][1] : 0;
  const weeklyDays = (() => {
    const w = [0, 0, 0, 0]; const now = new Date();
    for (const tl of trainingLogs) {
      const d = new Date(tl.date + "T00:00");
      const idx = Math.floor((now - d) / 86400000 / 7);
      if (idx >= 0 && idx < 4) w[idx]++;
    }
    return w.reverse();
  })();

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const prev = metrics.length > 1 ? metrics[metrics.length - 2] : null;
  const weightDiff = latest?.weight && prev?.weight ? (Number(latest.weight) - Number(prev.weight)).toFixed(1) : null;
  const fatDiff = latest?.body_fat && prev?.body_fat ? (Number(latest.body_fat) - Number(prev.body_fat)).toFixed(1) : null;

  if (loading) {
    const sk = { background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "shimmer 1.5s ease-in-out infinite" };
    return (
      <div style={S.page}>
        <div style={S.orb1} /><div style={S.orb2} />
        <header style={S.header}>
          <div style={{ ...sk, width: 60, height: 36, borderRadius: 10 }} />
          <div style={{ ...sk, width: 50, height: 24, borderRadius: 8 }} />
        </header>
        <main style={S.main}>
          {/* Form card skeleton */}
          <div style={{ ...S.card, padding: "24px 20px" }}>
            <div style={{ ...sk, height: 40, borderRadius: 10, marginBottom: 18 }} />
            <div style={{ ...sk, height: 36, marginBottom: 18 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ ...sk, height: 64 }} />
              <div style={{ ...sk, height: 64 }} />
            </div>
            <div style={{ ...sk, height: 48, borderRadius: 14 }} />
          </div>
          {/* Stats row skeleton */}
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <div style={{ ...sk, flex: 1, height: 80, borderRadius: 18 }} />
            <div style={{ ...sk, flex: 1, height: 80, borderRadius: 18 }} />
            <div style={{ ...sk, flex: 1, height: 80, borderRadius: 18 }} />
          </div>
          {/* Chart skeleton */}
          <div style={{ ...S.card, padding: "24px 20px" }}>
            <div style={{ ...sk, height: 36, borderRadius: 10, marginBottom: 16 }} />
            <div style={{ ...sk, height: 220 }} />
          </div>
        </main>
        <style>{`@keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.orb1} /><div style={S.orb2} />

      <header style={S.header}>
        <button onClick={() => router.push("/")} style={S.backBtn}>← 戻る</button>
        <h1 style={S.title}>体重</h1>
      </header>

      <main style={S.main}>

        {/* ─── INPUT FORM (TOP) ─── */}
        <form onSubmit={handleSubmit} style={S.card}>
          {/* Tab */}
          <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 18 }}>
            {["morning", "night"].map(tab => (
              <button key={tab} type="button" onClick={() => setFormTab(tab)} style={{
                flex: 1, padding: "10px 0", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: formTab === tab ? (tab === "morning" ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)") : "transparent",
                color: formTab === tab ? (tab === "morning" ? "#4ade80" : "#f59e0b") : "rgba(255,255,255,0.35)",
                transition: "all 0.2s",
              }}>
                {tab === "morning" ? "朝" : "夜"}
              </button>
            ))}
          </div>

          {/* Date */}
          <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => setDate(d => { const p = new Date(d); p.setDate(p.getDate() - 1); return p.toISOString().slice(0, 10); })} style={S.dateBtn}>◀</button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
            <button type="button" onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })} style={S.dateBtn}>▶</button>
            {date !== today() && <button type="button" onClick={() => setDate(today())} style={{ ...S.dateBtn, fontSize: 10, padding: "6px 10px" }}>今日</button>}
          </div>

          {/* Weight + Body Fat */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>体重</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" step="0.1" min="20" max="300"
                  value={formTab === "morning" ? weight : nightWeight}
                  onChange={(e) => formTab === "morning" ? setWeight(e.target.value) : setNightWeight(e.target.value)}
                  placeholder="65.0"
                  style={{ ...S.numInput, color: formTab === "morning" ? "#4ade80" : "#f59e0b" }}
                  onWheel={(e) => e.target.blur()} />
                <span style={S.unit}>kg</span>
              </div>
            </div>
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>体脂肪率</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" step="0.1" min="1" max="60"
                  value={formTab === "morning" ? bodyFat : nightBodyFat}
                  onChange={(e) => formTab === "morning" ? setBodyFat(e.target.value) : setNightBodyFat(e.target.value)}
                  placeholder="—"
                  style={{ ...S.numInput, color: formTab === "morning" ? "#4ade80" : "#f59e0b" }}
                  onWheel={(e) => e.target.blur()} />
                <span style={S.unit}>%</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {(weight || nightWeight) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              {weight && <span>朝 <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{weight}</span>kg</span>}
              {nightWeight && <span>夜 <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{nightWeight}</span>kg</span>}
              {weight && nightWeight && (
                <span style={{ color: "rgba(255,255,255,0.25)" }}>
                  差 <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)" }}>
                    {(Number(nightWeight) - Number(weight) >= 0 ? "+" : "")}{(Number(nightWeight) - Number(weight)).toFixed(1)}
                  </span>kg
                </span>
              )}
            </div>
          )}

          {/* Notes (collapsible) */}
          <div style={{ marginBottom: 16 }}>
            {notesOpen ? (
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="体調、睡眠、気分など" rows={2} style={S.notesInput} />
            ) : (
              <button type="button" onClick={() => setNotesOpen(true)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                <PenLine size={12} strokeWidth={1.5} /> + メモを追加
              </button>
            )}
          </div>

          {weightSaved ? (
            <button type="button" onClick={() => setWeightSaved(false)} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
              color: "rgba(255,255,255,0.45)", fontSize: 12, padding: "6px 16px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4, margin: "0 auto",
            }}>
              <PenLine size={12} strokeWidth={1.5} /> 編集
            </button>
          ) : (
            <button type="submit" disabled={saving || (!weight && !nightWeight)} style={{
              ...S.submitBtn,
              background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: (!weight && !nightWeight) && !saving ? 0.4 : 1,
            }}>
              {saving ? "保存中..." : "保存"}
            </button>
          )}
        </form>

        {/* ─── LATEST STATS ─── */}
        {latest && (
          <div style={S.statsRow}>
            {latest.weight != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>朝</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                  {Number(latest.weight).toFixed(1)}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>kg</span>
                </div>
                {weightDiff && (
                  <div style={{ fontSize: 10, color: Number(weightDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "var(--font-mono)" }}>
                    {Number(weightDiff) > 0 ? "+" : ""}{weightDiff}
                  </div>
                )}
              </div>
            )}
            {latest.weight_night != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>夜</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b", fontFamily: "var(--font-mono)" }}>
                  {Number(latest.weight_night).toFixed(1)}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>kg</span>
                </div>
              </div>
            )}
            {latest.body_fat != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>体脂肪</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#60a5fa", fontFamily: "var(--font-mono)" }}>
                  {Number(latest.body_fat).toFixed(1)}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>%</span>
                </div>
                {fatDiff && (
                  <div style={{ fontSize: 10, color: Number(fatDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "var(--font-mono)" }}>
                    {Number(fatDiff) > 0 ? "+" : ""}{fatDiff}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── GOAL PROGRESS ─── */}
        {goalWeight && (
          <div style={{ ...S.card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Target size={16} strokeWidth={2} color="#a78bfa" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>目標</span>
            </div>

            {goalProgress?.hasData ? (
              <>
                {/* Progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: goalProgress.pct >= 80 ? "linear-gradient(90deg, #22c55e, #4ade80)" : goalProgress.pct >= 40 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #a78bfa, #c4b5fd)",
                      width: `${goalProgress.pct}%`, transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>

                {/* Labels row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>現在</div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                      {goalProgress.latestW.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>kg</span>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>あと</div>
                    <span style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa", fontFamily: "var(--font-mono)" }}>
                      {goalProgress.remaining}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>kg</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>目標</div>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "rgba(168,139,250,0.7)", fontFamily: "var(--font-mono)" }}>
                      {goalWeight.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>kg</span>
                  </div>
                </div>

                {/* ETA / pace info from existing goalPrediction */}
                {goalPrediction && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                    {goalPrediction.eta
                      ? <>週 <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{Math.abs(goalPrediction.weekly).toFixed(1)}</span>kgペース → <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{goalPrediction.eta}頃</span></>
                      : goalPrediction.weekly === 0 ? "データが増えると予測が表示されます" : "現在のペースでは目標に近づいていません"}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <Scale size={24} strokeWidth={1.5} color="rgba(168,139,250,0.3)" />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "8px 0 0" }}>
                  体重を記録すると目標までの進捗が表示されます
                </p>
                <p style={{ fontSize: 11, color: "rgba(168,139,250,0.5)", margin: "4px 0 0" }}>
                  目標: {goalWeight.toFixed(1)}kg
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── EMPTY STATE ─── */}
        {metrics.length === 0 && (
          <div style={{ ...S.card, textAlign: "center", padding: "40px 20px" }}>
            <Scale size={36} strokeWidth={1.5} color="rgba(255,255,255,0.15)" />
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)", margin: "12px 0 4px" }}>
              上のフォームから記録しよう
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              2日以上でグラフが表示されます
            </p>
          </div>
        )}

        {/* ─── CHART ─── */}
        {chartData.length >= 2 && (
          <div style={S.card}>
            {/* Chart mode toggle — only show if body fat data exists */}
            {hasFatData && (
              <div style={{ display: "flex", gap: 0, marginBottom: 10, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                {[{ val: "weight", label: "体重" }, { val: "fat", label: "体脂肪" }].map(({ val, label }) => (
                  <button key={val} onClick={() => setChartMode(val)} style={{
                    flex: 1, padding: "8px 0", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: chartMode === val ? (val === "weight" ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.15)") : "transparent",
                    color: chartMode === val ? (val === "weight" ? "#4ade80" : "#60a5fa") : "rgba(255,255,255,0.35)",
                    transition: "all 0.2s",
                  }}>{label}</button>
                ))}
              </div>
            )}

            {/* Period tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              {[{ val: 7, label: "7日" }, { val: 30, label: "30日" }, { val: 90, label: "90日" }, { val: 180, label: "6ヶ月" }].map(({ val, label }) => (
                <button key={val} onClick={() => setRange(val)} style={{
                  flex: 1, padding: "8px 0", border: "none", fontSize: 12, cursor: "pointer",
                  background: range === val ? "rgba(96,165,250,0.2)" : "transparent",
                  color: range === val ? "#60a5fa" : "rgba(255,255,255,0.35)",
                  fontWeight: range === val ? 600 : 400, transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataWithMA} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} interval="preserveStartEnd" />

                  {/* Y Axis — changes based on chart mode */}
                  {chartMode === "weight" ? (
                    <YAxis yAxisId="left" domain={[wMin, wMax]} tick={{ fill: "rgba(74,222,128,0.6)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  ) : (
                    <YAxis yAxisId="left" domain={[fMin, fMax]} tick={{ fill: "rgba(96,165,250,0.6)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  )}

                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />

                  {/* ── Weight mode lines ── */}
                  {chartMode === "weight" && goalWeight && (
                    <ReferenceLine yAxisId="left" y={goalWeight} stroke="rgba(168,139,250,0.5)" strokeDasharray="6 4" strokeWidth={1.5}
                      label={{ value: `目標 ${goalWeight}kg`, position: "right", fill: "rgba(168,139,250,0.6)", fontSize: 10, fontWeight: 600 }} />
                  )}
                  {chartMode === "weight" && (
                    <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2.5}
                      dot={{ r: 4, fill: "#4ade80", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#4ade80", stroke: "rgba(74,222,128,0.3)", strokeWidth: 4 }} connectNulls />
                  )}
                  {chartMode === "weight" && (
                    <Line yAxisId="left" type="monotone" dataKey="weightMA7" stroke="rgba(74,222,128,0.35)" strokeWidth={2.5}
                      dot={false} activeDot={false} connectNulls />
                  )}
                  {chartMode === "weight" && hasNightWeight && (
                    <Line yAxisId="left" type="monotone" dataKey="weightNight" stroke="#f59e0b" strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "rgba(245,158,11,0.3)", strokeWidth: 4 }} connectNulls />
                  )}

                  {/* ── Body fat mode lines ── */}
                  {chartMode === "fat" && (
                    <Line yAxisId="left" type="monotone" dataKey="bodyFat" stroke="#60a5fa" strokeWidth={2.5}
                      dot={{ r: 4, fill: "#60a5fa", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#60a5fa", stroke: "rgba(96,165,250,0.3)", strokeWidth: 4 }} connectNulls />
                  )}
                  {chartMode === "fat" && (
                    <Line yAxisId="left" type="monotone" dataKey="bodyFatMA7" stroke="rgba(96,165,250,0.35)" strokeWidth={2.5}
                      dot={false} activeDot={false} connectNulls />
                  )}
                  {chartMode === "fat" && hasNightFat && (
                    <Line yAxisId="left" type="monotone" dataKey="bodyFatNight" stroke="#f59e0b" strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "rgba(245,158,11,0.3)", strokeWidth: 4 }} connectNulls />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend — changes based on chart mode */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {chartMode === "weight" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 14, height: 3, background: "#4ade80", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>朝</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 14, height: 3, background: "rgba(74,222,128,0.35)", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>7日平均</span>
                  </div>
                  {hasNightWeight && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 14, height: 3, background: "#f59e0b", borderRadius: 2 }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>夜</span>
                    </div>
                  )}
                  {goalWeight && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 14, height: 0, borderTop: "2px dashed rgba(168,139,250,0.6)" }} />
                      <span style={{ fontSize: 11, color: "rgba(168,139,250,0.6)" }}>目標</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 14, height: 3, background: "#60a5fa", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>朝</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 14, height: 3, background: "rgba(96,165,250,0.35)", borderRadius: 2 }} />
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>7日平均</span>
                  </div>
                  {hasNightFat && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 14, height: 3, background: "#f59e0b", borderRadius: 2 }} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>夜</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {chartData.length === 1 && (
          <div style={{ ...S.card, textAlign: "center", padding: "20px" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>あと1日分でグラフが見れます</p>
          </div>
        )}

        {/* ─── WEEKLY SUMMARY CARD ─── */}
        {weeklySummary && (() => {
          const fmtShort = (ds) => { const [, m, d] = ds.split("-"); return `${Number(m)}/${Number(d)}`; };
          const wc = weeklySummary.weightChange;
          const hasPfcGoals = weeklySummary.pRate != null || weeklySummary.fRate != null || weeklySummary.cRate != null;

          // X share text
          const shareText = [
            "今週のダツデブ成果",
            wc != null ? `体重${wc > 0 ? "+" : ""}${wc}kg` : null,
            weeklySummary.savings != null && weeklySummary.savings > 0 ? `食費を${weeklySummary.savings.toLocaleString()}円節約` : null,
            "#ダツデブ",
          ].filter(Boolean).join("　");
          const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://macro-builder.vercel.app/")}`;

          const PfcBar = ({ label, color, rate, avg, goal, unit }) => (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)" }}>
                  {avg}{unit}{goal ? ` / ${goal}${unit}` : ""}
                  {rate != null && <span style={{ color: rate >= 80 ? "#4ade80" : rate >= 50 ? "#fbbf24" : "#f87171", fontWeight: 700, marginLeft: 6 }}>{rate}%</span>}
                </span>
              </div>
              {rate != null && (
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3, width: `${rate}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              )}
            </div>
          );

          return (
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid transparent",
            borderImage: "linear-gradient(135deg, rgba(74,222,128,0.25), rgba(96,165,250,0.25), rgba(168,139,250,0.25)) 1",
            borderRadius: 0, // borderImage doesn't work with borderRadius
            padding: "24px 20px",
            marginBottom: 20,
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Background glow */}
            <div style={{ position: "absolute", top: -60, right: -60, width: 160, height: 160, background: "radial-gradient(circle,rgba(74,222,128,0.06) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 120, height: 120, background: "radial-gradient(circle,rgba(96,165,250,0.05) 0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>今週のまとめ</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}>
                {fmtShort(weeklySummary.dateFrom)} - {fmtShort(weeklySummary.dateTo)}
              </span>
            </div>

            {/* Stats row: Weight + Savings/Cost */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, position: "relative" }}>
              {/* Weight change */}
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "16px 12px", textAlign: "center",
              }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>体重変動</div>
                {wc !== null ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      {wc < -0.1 ? <TrendingDown size={18} color="#4ade80" strokeWidth={2.5} /> :
                       wc > 0.1 ? <TrendingUp size={18} color="#f87171" strokeWidth={2.5} /> :
                       <Minus size={18} color="rgba(255,255,255,0.4)" strokeWidth={2.5} />}
                      <span style={{
                        fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)",
                        color: wc < -0.1 ? "#4ade80" : wc > 0.1 ? "#f87171" : "rgba(255,255,255,0.5)",
                      }}>
                        {wc > 0 ? "+" : ""}{wc}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>kg</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                      {weeklySummary.weightFrom?.toFixed(1)} → {weeklySummary.weightTo?.toFixed(1)}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 22, color: "rgba(255,255,255,0.12)", fontWeight: 700 }}>—</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>2日以上の記録で表示</div>
                  </>
                )}
              </div>

              {/* Savings or total cost */}
              <div style={{
                flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "16px 12px", textAlign: "center",
              }}>
                {weeklySummary.savings != null ? (
                  <>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
                      {weeklySummary.savings >= 0 ? "食費節約" : "予算超過"}
                    </div>
                    <div style={{
                      fontSize: 26, fontWeight: 800, fontFamily: "var(--font-mono)",
                      color: weeklySummary.savings >= 0 ? "#facc15" : "#f87171",
                    }}>
                      ¥{Math.abs(weeklySummary.savings).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                      ¥{weeklySummary.totalSpent.toLocaleString()} / ¥{(budgetGoal * weeklySummary.daysWithData).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>食費合計</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#facc15" }}>
                      ¥{weeklySummary.totalSpent.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 6 }}>
                      {weeklySummary.daysWithData}日間
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PFC Achievement */}
            {(weeklySummary.avgP > 0 || weeklySummary.avgF > 0 || weeklySummary.avgC > 0) && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: 0.5, marginBottom: 12 }}>
                PFC達成率{hasPfcGoals ? "" : "（日平均）"}
              </div>
              <PfcBar label="P" color="#f87171" rate={weeklySummary.pRate} avg={weeklySummary.avgP} goal={proteinGoal} unit="g" />
              <PfcBar label="F" color="#facc15" rate={weeklySummary.fRate} avg={weeklySummary.avgF} goal={fatGoal} unit="g" />
              <PfcBar label="C" color="#60a5fa" rate={weeklySummary.cRate} avg={weeklySummary.avgC} goal={carbsGoal} unit="g" />
            </div>
            )}

            {/* Avg Calories */}
            {weeklySummary.avgCal && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", marginBottom: 16,
              borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>日平均カロリー</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fbbf24" }}>
                {weeklySummary.avgCal.toLocaleString()}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>kcal</span>
              {calorieGoal && (
                <span style={{ fontSize: 10, color: weeklySummary.avgCal <= calorieGoal ? "rgba(74,222,128,0.6)" : "rgba(248,113,113,0.5)" }}>
                  / {calorieGoal.toLocaleString()}
                </span>
              )}
            </div>
            )}

            {/* Feedback */}
            {weeklyReview?.feedback && (
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12, padding: "12px 14px", marginBottom: 16,
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{weeklyReview.feedback.icon}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{weeklyReview.feedback.text}</span>
            </div>
            )}

            {/* X Share Button */}
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 0", borderRadius: 12,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                textDecoration: "none", cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Xでシェア</span>
            </a>
          </div>
          );
        })()}

        {/* ─── TRAINING STATS (collapsible) ─── */}
        {trainingLogs.length > 0 && (
          <div style={S.card}>
            <button onClick={() => setTrainingOpen(!trainingOpen)} style={S.accordionBtn}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Dumbbell size={16} strokeWidth={1.5} color="#a78bfa" />
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>トレーニング</span>
                <span style={{ fontSize: 12, color: "#a78bfa", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  週{trainingWeekCount}回
                </span>
              </div>
              <ChevronDown size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{ transition: "transform 0.25s", transform: trainingOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>

            <div style={{ maxHeight: trainingOpen ? 800 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.25s ease", opacity: trainingOpen ? 1 : 0 }}>
              <div style={{ paddingTop: 18 }}>
                {/* Weekly bars */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                    {weeklyDays.map((count, i) => (
                      <div key={i} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ width: "100%", height: Math.max(count * 12, 4), borderRadius: 4, background: i === 3 ? "#a78bfa" : "rgba(168,139,250,0.3)", transition: "height 0.3s" }} />
                        <span style={{ fontSize: 10, color: i === 3 ? "#a78bfa" : "rgba(255,255,255,0.25)", marginTop: 4, display: "block" }}>
                          {i === 3 ? "今週" : `${3 - i}w前`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body part bars */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 10, fontWeight: 600 }}>部位バランス</div>
                {bodyPartCounts.map(([partId, count]) => {
                  const info = BODY_PART_LABELS[partId] || { label: partId, color: "#a78bfa" };
                  return (
                    <div key={partId} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: info.color, fontWeight: 600 }}>{info.label}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mono)" }}>{count}回</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, background: info.color, width: `${maxBPC > 0 ? (count / maxBPC) * 100 : 0}%`, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}

                {/* Recent training */}
                <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>直近</div>
                  {trainingLogs.slice().reverse().slice(0, 5).map(tl => (
                    <div key={tl.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 36 }}>
                        {`${new Date(tl.date + "T00:00").getMonth() + 1}/${new Date(tl.date + "T00:00").getDate()}`}
                      </span>
                      <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
                        {(tl.body_parts || []).map(p => {
                          const info = BODY_PART_LABELS[p] || { label: p, color: "#a78bfa" };
                          return <span key={p} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: `${info.color}20`, color: info.color }}>{info.label}</span>;
                        })}
                      </div>
                      <span style={{ display: "flex", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={8} fill={i <= (tl.intensity || 0) ? "#fbbf24" : "transparent"} color={i <= (tl.intensity || 0) ? "#fbbf24" : "rgba(255,255,255,0.1)"} strokeWidth={1.5} />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── RECENT RECORDS ─── */}
        {metrics.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10, fontWeight: 600 }}>直近の記録</div>
            {metrics.slice().reverse().slice(0, 10).map((m, i) => (
              <div key={m.id || `m-${m.date}-${i}`} style={S.logItem}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", minWidth: 40 }}>
                  {`${new Date(m.date + "T00:00").getMonth() + 1}/${new Date(m.date + "T00:00").getDate()}`}
                </span>
                <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  {m.weight != null && <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", fontFamily: "var(--font-mono)" }}>朝{Number(m.weight).toFixed(1)}</span>}
                  {m.weight_night != null && <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", fontFamily: "var(--font-mono)" }}>夜{Number(m.weight_night).toFixed(1)}</span>}
                  {m.body_fat != null && <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", fontFamily: "var(--font-mono)" }}>{Number(m.body_fat).toFixed(1)}%</span>}
                </div>
                {m.notes && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>{m.notes}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 60 }} />
      </main>

      {toast && (
        <div style={{
          position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 12,
          background: toast.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.type === "success" ? "#4ade80" : "#f87171",
          fontSize: 14, fontWeight: 600, zIndex: 9999, animation: "fadeUp 0.3s ease-out",
        }}>{toast.msg}</div>
      )}
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px) translateX(-50%); } to { opacity:1; transform:translateY(0) translateX(-50%); } }`}</style>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)", color: "white", position: "relative", overflow: "hidden" },
  orb1: { position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle,rgba(34,197,94,0.06)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  orb2: { position: "fixed", bottom: -150, left: -150, width: 400, height: 400, background: "radial-gradient(circle,rgba(59,130,246,0.05)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },

  header: { padding: "20px 24px 12px", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 },
  backBtn: { padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  title: { fontSize: 18, fontWeight: 700, margin: 0, color: "rgba(255,255,255,0.85)" },
  main: { maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" },

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 22, padding: "24px 20px", marginBottom: 18 },

  statsRow: { display: "flex", gap: 10, marginBottom: 18 },
  statCard: { flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px", textAlign: "center" },

  dateBtn: { width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  dateInput: { flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#4ade80", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, outline: "none", colorScheme: "dark" },

  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  numWrap: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 10px" },
  numInput: { width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, textAlign: "right", minWidth: 0 },
  unit: { fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 },

  submitBtn: { width: "100%", padding: "14px 0", borderRadius: 14, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" },

  notesInput: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "'Noto Sans JP',sans-serif", outline: "none", resize: "vertical", minHeight: 44, boxSizing: "border-box" },

  accordionBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", padding: 0 },

  logItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 6 },
};

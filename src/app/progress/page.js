"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveBodyMetric, loadBodyMetrics, loadBodyMetricByDate, loadProfile, loadTrainingLogsRange } from "@/lib/db";
import { saveLocalBodyMetric, loadLocalBodyMetrics, loadLocalBodyMetricByDate, loadLocalProfile, loadLocalTrainingLogsRange } from "@/lib/local-db";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { PenLine, Scale, Dumbbell, Star, ChevronDown } from "lucide-react";

const BODY_PART_LABELS = {
  chest: { label: "胸", color: "#f87171" },
  back: { label: "背中", color: "#60a5fa" },
  shoulders: { label: "肩", color: "#fbbf24" },
  arms: { label: "腕", color: "#a78bfa" },
  legs: { label: "脚", color: "#4ade80" },
  abs: { label: "腹", color: "#f472b6" },
  cardio: { label: "有酸素", color: "#22d3ee" },
};

const tooltipLabels = { weight: "朝", weightNight: "夜", bodyFat: "体脂肪(朝)", bodyFatNight: "体脂肪(夜)" };
const tooltipUnits = { weight: "kg", weightNight: "kg", bodyFat: "%", bodyFatNight: "%" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,15,30,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "12px 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", minWidth: 140 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{tooltipLabels[p.dataKey] || p.dataKey}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "'Space Mono',monospace", marginLeft: "auto" }}>
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
  const [range, setRange] = useState(90);
  const [goalWeight, setGoalWeight] = useState(null);

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
    if (user) { loadProfile(supabase, user.id).then(p => { if (p?.goal_weight) setGoalWeight(Number(p.goal_weight)); }); }
    else { const p = loadLocalProfile(); if (p?.goal_weight) setGoalWeight(Number(p.goal_weight)); }
  }, [user, loading, supabase]);

  useEffect(() => {
    if (loading) return;
    if (user) { loadBodyMetrics(supabase, user.id, range || 3650).then(setMetrics); }
    else { setMetrics(loadLocalBodyMetrics(range || 3650)); }
  }, [supabase, user, range, loading]);

  useEffect(() => {
    if (loading) return;
    if (user) { loadTrainingLogsRange(supabase, user.id, 30).then(setTrainingLogs); }
    else { setTrainingLogs(loadLocalTrainingLogsRange(30)); }
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
      } else {
        setWeight(""); setBodyFat(""); setNightWeight(""); setNightBodyFat(""); setNotes("");
        setNotesOpen(false);
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
    if (ok) {
      showToast("success", "保存しました");
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

  const morningWeights = chartData.filter(d => d.weight != null).map(d => d.weight);
  const nightWeights = chartData.filter(d => d.weightNight != null).map(d => d.weightNight);
  const fats = chartData.filter(d => d.bodyFat != null).map(d => d.bodyFat);
  const allWeights = [...morningWeights, ...nightWeights, ...(goalWeight ? [goalWeight] : [])];
  const wMin = allWeights.length ? Math.floor(Math.min(...allWeights) - 1) : 50;
  const wMax = allWeights.length ? Math.ceil(Math.max(...allWeights) + 1) : 80;
  const fMin = fats.length ? Math.floor(Math.min(...fats) - 2) : 5;
  const fMax = fats.length ? Math.ceil(Math.max(...fats) + 2) : 30;
  const hasNightWeight = nightWeights.length > 0;

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
    return (
      <div style={S.page}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>読み込み中...</p>
        </div>
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
              {weight && <span>朝 <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{weight}</span>kg</span>}
              {nightWeight && <span>夜 <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{nightWeight}</span>kg</span>}
              {weight && nightWeight && (
                <span style={{ color: "rgba(255,255,255,0.25)" }}>
                  差 <span style={{ fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.5)" }}>
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

          <button type="submit" disabled={saving || (!weight && !nightWeight)} style={{
            ...S.submitBtn,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: (!weight && !nightWeight) && !saving ? 0.4 : 1,
          }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </form>

        {/* ─── LATEST STATS ─── */}
        {latest && (
          <div style={S.statsRow}>
            {latest.weight != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>朝</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                  {Number(latest.weight).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>kg</span>
                </div>
                {weightDiff && (
                  <div style={{ fontSize: 10, color: Number(weightDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                    {Number(weightDiff) > 0 ? "+" : ""}{weightDiff}
                  </div>
                )}
              </div>
            )}
            {latest.weight_night != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>夜</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>
                  {Number(latest.weight_night).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>kg</span>
                </div>
              </div>
            )}
            {latest.body_fat != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>体脂肪</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#60a5fa", fontFamily: "'Space Mono',monospace" }}>
                  {Number(latest.body_fat).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>%</span>
                </div>
                {fatDiff && (
                  <div style={{ fontSize: 10, color: Number(fatDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                    {Number(fatDiff) > 0 ? "+" : ""}{fatDiff}
                  </div>
                )}
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
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>
              2日以上でグラフが表示されます
            </p>
          </div>
        )}

        {/* ─── CHART ─── */}
        {chartData.length >= 2 && (
          <div style={S.card}>
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              {[{ val: 30, label: "30日" }, { val: 90, label: "90日" }, { val: 0, label: "全て" }].map(({ val, label }) => (
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
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" domain={[wMin, wMax]} tick={{ fill: "rgba(74,222,128,0.6)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  {fats.length > 0 && (
                    <YAxis yAxisId="right" orientation="right" domain={[fMin, fMax]} tick={{ fill: "rgba(96,165,250,0.6)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  )}
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
                  {goalWeight && (
                    <ReferenceLine yAxisId="left" y={goalWeight} stroke="rgba(168,139,250,0.5)" strokeDasharray="6 4" strokeWidth={1.5}
                      label={{ value: `目標 ${goalWeight}kg`, position: "right", fill: "rgba(168,139,250,0.6)", fontSize: 10, fontWeight: 600 }} />
                  )}
                  <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#4ade80", stroke: "#0a0a0f", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#4ade80", stroke: "rgba(74,222,128,0.3)", strokeWidth: 4 }} connectNulls />
                  {hasNightWeight && (
                    <Line yAxisId="left" type="monotone" dataKey="weightNight" stroke="#f59e0b" strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "rgba(245,158,11,0.3)", strokeWidth: 4 }} connectNulls />
                  )}
                  {fats.length > 0 && (
                    <Line yAxisId="right" type="monotone" dataKey="bodyFat" stroke="#60a5fa" strokeWidth={2}
                      dot={{ r: 4, fill: "#60a5fa", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#60a5fa", stroke: "rgba(96,165,250,0.3)", strokeWidth: 4 }} connectNulls strokeDasharray="5 3" />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 14, height: 3, background: "#4ade80", borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>朝</span>
              </div>
              {hasNightWeight && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 3, background: "#f59e0b", borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>夜</span>
                </div>
              )}
              {fats.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 0, borderTop: "2px dashed #60a5fa" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>体脂肪</span>
                </div>
              )}
              {goalWeight && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 0, borderTop: "2px dashed rgba(168,139,250,0.6)" }} />
                  <span style={{ fontSize: 10, color: "rgba(168,139,250,0.6)" }}>目標</span>
                </div>
              )}
            </div>
          </div>
        )}

        {chartData.length === 1 && (
          <div style={{ ...S.card, textAlign: "center", padding: "20px" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: 0 }}>あと1日分でグラフが見れます</p>
          </div>
        )}

        {/* ─── TRAINING STATS (collapsible) ─── */}
        {trainingLogs.length > 0 && (
          <div style={S.card}>
            <button onClick={() => setTrainingOpen(!trainingOpen)} style={S.accordionBtn}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Dumbbell size={16} strokeWidth={1.5} color="#a78bfa" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>トレーニング</span>
                <span style={{ fontSize: 12, color: "#a78bfa", fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
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
                        <span style={{ fontSize: 9, color: i === 3 ? "#a78bfa" : "rgba(255,255,255,0.25)", marginTop: 4, display: "block" }}>
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
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono',monospace" }}>{count}回</span>
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
                          return <span key={p} style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: `${info.color}20`, color: info.color }}>{info.label}</span>;
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
            {metrics.slice().reverse().slice(0, 10).map(m => (
              <div key={m.id} style={S.logItem}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", minWidth: 40 }}>
                  {`${new Date(m.date + "T00:00").getMonth() + 1}/${new Date(m.date + "T00:00").getDate()}`}
                </span>
                <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  {m.weight != null && <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", fontFamily: "'Space Mono',monospace" }}>朝{Number(m.weight).toFixed(1)}</span>}
                  {m.weight_night != null && <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>夜{Number(m.weight_night).toFixed(1)}</span>}
                  {m.body_fat != null && <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", fontFamily: "'Space Mono',monospace" }}>{Number(m.body_fat).toFixed(1)}%</span>}
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
  dateInput: { flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#4ade80", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 600, outline: "none", colorScheme: "dark" },

  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  numWrap: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 10px" },
  numInput: { width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, textAlign: "right", minWidth: 0 },
  unit: { fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 },

  submitBtn: { width: "100%", padding: "14px 0", borderRadius: 14, border: "none", color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" },

  notesInput: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", color: "rgba(255,255,255,0.7)", fontSize: 14, fontFamily: "'Noto Sans JP',sans-serif", outline: "none", resize: "vertical", minHeight: 44, boxSizing: "border-box" },

  accordionBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", padding: 0 },

  logItem: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 6 },
};

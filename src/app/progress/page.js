"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveBodyMetric, loadBodyMetrics, loadBodyMetricByDate, loadProfile, loadTrainingLogsRange } from "@/lib/db";
import { saveLocalBodyMetric, loadLocalBodyMetrics, loadLocalBodyMetricByDate, loadLocalProfile, loadLocalTrainingLogsRange } from "@/lib/local-db";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { PenLine, Scale, BarChart3, Dumbbell, Star } from "lucide-react";

const BODY_PART_LABELS = {
  chest: { label: "胸", color: "#f87171" },
  back: { label: "背中", color: "#60a5fa" },
  shoulders: { label: "肩", color: "#fbbf24" },
  arms: { label: "腕", color: "#a78bfa" },
  legs: { label: "脚", color: "#4ade80" },
  abs: { label: "腹", color: "#f472b6" },
  cardio: { label: "有酸素", color: "#22d3ee" },
};

// ─── カスタムツールチップ ───
const tooltipLabels = {
  weight: "体重(朝)", weightNight: "体重(夜)",
  bodyFat: "体脂肪率(朝)", bodyFatNight: "体脂肪率(夜)",
};
const tooltipUnits = { weight: "kg", weightNight: "kg", bodyFat: "%", bodyFatNight: "%" };

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,15,30,0.95)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: "12px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      minWidth: 160,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            {tooltipLabels[p.dataKey] || p.dataKey}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "'Space Mono',monospace", marginLeft: "auto" }}>
            {p.value}{tooltipUnits[p.dataKey] || ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
  const [formTab, setFormTab] = useState("morning"); // "morning" | "night"
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [nightWeight, setNightWeight] = useState("");
  const [nightBodyFat, setNightBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  // Chart data
  const [metrics, setMetrics] = useState([]);
  const [range, setRange] = useState(90); // 30, 90, 0 (all)
  const [goalWeight, setGoalWeight] = useState(null);

  // Training stats
  const [trainingLogs, setTrainingLogs] = useState([]);

  // Auth (ゲストも許可)
  useEffect(() => {
    const authTimeout = setTimeout(() => { setLoading(false); }, 5000);
    supabase.auth.getUser().then(({ data: { user } }) => {
      clearTimeout(authTimeout);
      setUser(user); // null = ゲスト
      setLoading(false);
    }).catch(() => { clearTimeout(authTimeout); setLoading(false); });
    return () => clearTimeout(authTimeout);
  }, [supabase]);

  // 目標体重の読み込み
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadProfile(supabase, user.id).then(p => {
        if (p?.goal_weight) setGoalWeight(Number(p.goal_weight));
      });
    } else {
      const p = loadLocalProfile();
      if (p?.goal_weight) setGoalWeight(Number(p.goal_weight));
    }
  }, [user, loading, supabase]);

  // Load chart data
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadBodyMetrics(supabase, user.id, range || 3650).then(setMetrics);
    } else {
      setMetrics(loadLocalBodyMetrics(range || 3650));
    }
  }, [supabase, user, range, loading]);

  // Load training logs (30 days)
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadTrainingLogsRange(supabase, user.id, 30).then(setTrainingLogs);
    } else {
      setTrainingLogs(loadLocalTrainingLogsRange(30));
    }
  }, [supabase, user, loading]);

  // Load existing data for selected date
  useEffect(() => {
    if (loading) return;
    const applyMetric = (m) => {
      if (m) {
        setWeight(m.weight != null ? String(m.weight) : "");
        setBodyFat(m.body_fat != null ? String(m.body_fat) : "");
        setNightWeight(m.weight_night != null ? String(m.weight_night) : "");
        setNightBodyFat(m.body_fat_night != null ? String(m.body_fat_night) : "");
        setNotes(m.notes || "");
      } else {
        setWeight(""); setBodyFat("");
        setNightWeight(""); setNightBodyFat("");
        setNotes("");
      }
    };
    if (user) {
      loadBodyMetricByDate(supabase, user.id, date).then(applyMetric);
    } else {
      applyMetric(loadLocalBodyMetricByDate(date));
    }
  }, [supabase, user, date, loading]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

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
    if (user) {
      ok = await saveBodyMetric(supabase, user.id, metricData);
    } else {
      ok = saveLocalBodyMetric(metricData);
    }
    setSaving(false);

    if (ok) {
      showToast("success", "記録完了");
      if (user) {
        loadBodyMetrics(supabase, user.id, range || 3650).then(setMetrics);
      } else {
        setMetrics(loadLocalBodyMetrics(range || 3650));
      }
    } else {
      showToast("error", "保存に失敗しました");
    }
  };

  // Chart data formatting
  const chartData = metrics.map((m) => ({
    date: m.date,
    label: `${new Date(m.date + "T00:00").getMonth() + 1}/${new Date(m.date + "T00:00").getDate()}`,
    weight: m.weight != null ? Number(m.weight) : null,
    weightNight: m.weight_night != null ? Number(m.weight_night) : null,
    bodyFat: m.body_fat != null ? Number(m.body_fat) : null,
    bodyFatNight: m.body_fat_night != null ? Number(m.body_fat_night) : null,
  }));

  // Y-axis domains（goalWeight + 夜体重も含めてラインが見切れないように）
  const morningWeights = chartData.filter((d) => d.weight != null).map((d) => d.weight);
  const nightWeights = chartData.filter((d) => d.weightNight != null).map((d) => d.weightNight);
  const fats = chartData.filter((d) => d.bodyFat != null).map((d) => d.bodyFat);
  const allWeights = [...morningWeights, ...nightWeights, ...(goalWeight ? [goalWeight] : [])];
  const wMin = allWeights.length ? Math.floor(Math.min(...allWeights) - 1) : 50;
  const wMax = allWeights.length ? Math.ceil(Math.max(...allWeights) + 1) : 80;
  const fMin = fats.length ? Math.floor(Math.min(...fats) - 2) : 5;
  const fMax = fats.length ? Math.ceil(Math.max(...fats) + 2) : 30;
  const hasNightWeight = nightWeights.length > 0;

  // Training stats calculations
  const trainingWeekCount = (() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);
    return trainingLogs.filter((t) => t.date >= weekStr).length;
  })();

  const bodyPartCounts = (() => {
    const counts = {};
    for (const tl of trainingLogs) {
      for (const part of (tl.body_parts || [])) {
        counts[part] = (counts[part] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();

  const maxBodyPartCount = bodyPartCounts.length > 0 ? bodyPartCounts[0][1] : 0;

  // Weekly training heatmap (last 4 weeks)
  const weeklyTrainingDays = (() => {
    const weeks = [0, 0, 0, 0];
    const now = new Date();
    for (const tl of trainingLogs) {
      const d = new Date(tl.date + "T00:00");
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.floor(diffDays / 7);
      if (weekIdx >= 0 && weekIdx < 4) {
        // Count unique dates per week
        weeks[weekIdx]++;
      }
    }
    return weeks.reverse(); // oldest first
  })();

  // Latest values
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
      <div style={S.orb1} />
      <div style={S.orb2} />

      {/* Header */}
      <header style={S.header}>
        <button onClick={() => router.push("/")} style={S.backBtn}>← 戻る</button>
        <h1 style={S.title}>体重・体脂肪記録</h1>
      </header>

      <main style={S.main}>

        {/* Latest stats */}
        {latest && (
          <div style={S.statsRow}>
            {latest.weight != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>最新体重(朝)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                  {Number(latest.weight).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>kg</span>
                </div>
                {weightDiff && (
                  <div style={{ fontSize: 10, color: Number(weightDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                    {Number(weightDiff) > 0 ? "+" : ""}{weightDiff}kg
                  </div>
                )}
              </div>
            )}
            {latest.weight_night != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>最新体重(夜)</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>
                  {Number(latest.weight_night).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>kg</span>
                </div>
              </div>
            )}
            {latest.body_fat != null && (
              <div style={S.statCard}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>最新体脂肪率</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", fontFamily: "'Space Mono',monospace" }}>
                  {Number(latest.body_fat).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>%</span>
                </div>
                {fatDiff && (
                  <div style={{ fontSize: 10, color: Number(fatDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                    {Number(fatDiff) > 0 ? "+" : ""}{fatDiff}%
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {metrics.length === 0 && (
          <div style={{ ...S.card, textAlign: "center", padding: "40px 20px" }}>
            <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
              <Scale size={36} strokeWidth={1.5} color="rgba(255,255,255,0.15)" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>
              体重を記録するとグラフが表示されます
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 0 16px", lineHeight: 1.6 }}>
              下のフォームから最初の体重を入力してみましょう。
              <br />2日以上の記録で推移グラフが見られます。
            </p>
            <a href="#form" style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "8px 16px", borderRadius: 10,
              background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
              color: "#4ade80", fontSize: 12, fontWeight: 600, textDecoration: "none",
            }}>
              <PenLine size={12} strokeWidth={1.5} />
              体重を入力する
            </a>
          </div>
        )}

        {/* Chart */}
        {chartData.length >= 2 && (
          <div style={S.card}>
            {/* Range tabs */}
            <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
              {[
                { val: 30, label: "30日" },
                { val: 90, label: "90日" },
                { val: 0, label: "全期間" },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setRange(val)} style={{
                  flex: 1, padding: "6px 0", border: "none", fontSize: 11, cursor: "pointer",
                  background: range === val ? "rgba(96,165,250,0.2)" : "transparent",
                  color: range === val ? "#60a5fa" : "rgba(255,255,255,0.35)",
                  fontWeight: range === val ? 600 : 400,
                  transition: "all 0.2s",
                }}>{label}</button>
              ))}
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[wMin, wMax]}
                    tick={{ fill: "rgba(74,222,128,0.6)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  {fats.length > 0 && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[fMin, fMax]}
                      tick={{ fill: "rgba(96,165,250,0.6)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                  )}
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
                  {goalWeight && (
                    <ReferenceLine
                      yAxisId="left"
                      y={goalWeight}
                      stroke="rgba(168,139,250,0.5)"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{
                        value: `目標 ${goalWeight}kg`,
                        position: "right",
                        fill: "rgba(168,139,250,0.6)",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    />
                  )}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    stroke="#4ade80"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#4ade80", stroke: "#0a0a0f", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#4ade80", stroke: "rgba(74,222,128,0.3)", strokeWidth: 4 }}
                    connectNulls
                  />
                  {hasNightWeight && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="weightNight"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f59e0b", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "rgba(245,158,11,0.3)", strokeWidth: 4 }}
                      connectNulls
                    />
                  )}
                  {fats.length > 0 && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bodyFat"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#60a5fa", stroke: "#0a0a0f", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#60a5fa", stroke: "rgba(96,165,250,0.3)", strokeWidth: 4 }}
                      connectNulls
                      strokeDasharray="5 3"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 14, height: 3, background: "#4ade80", borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>体重(朝)</span>
              </div>
              {hasNightWeight && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 3, background: "#f59e0b", borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>体重(夜)</span>
                </div>
              )}
              {fats.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 0, borderTop: "2px dashed #60a5fa" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>体脂肪率</span>
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

        {/* Training Stats */}
        {trainingLogs.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <Dumbbell size={14} strokeWidth={1.5} />トレーニング統計（直近30日）
            </div>

            {/* Weekly frequency */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>今週の回数</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", fontFamily: "'Space Mono',monospace" }}>
                  {trainingWeekCount}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>回</span>
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
                {weeklyTrainingDays.map((count, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: "100%", height: Math.max(count * 10, 4), borderRadius: 4,
                      background: i === 3 ? "#a78bfa" : "rgba(168,139,250,0.3)",
                      transition: "height 0.3s ease",
                    }} />
                    <span style={{ fontSize: 9, color: i === 3 ? "#a78bfa" : "rgba(255,255,255,0.25)" }}>
                      {i === 3 ? "今週" : `${3 - i}週前`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Body part balance */}
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>部位バランス</div>
              {bodyPartCounts.map(([partId, count]) => {
                const info = BODY_PART_LABELS[partId] || { label: partId, color: "#a78bfa" };
                const pct = maxBodyPartCount > 0 ? (count / maxBodyPartCount) * 100 : 0;
                const avg = count / 4; // 4 weeks average
                return (
                  <div key={partId} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: info.color, fontWeight: 600 }}>{info.label}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono',monospace" }}>
                        {count}回 <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>({avg.toFixed(1)}/週)</span>
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3, background: info.color,
                        width: `${pct}%`, transition: "width 0.5s ease",
                        opacity: count < avg * 0.5 ? 0.5 : 1,
                      }} />
                    </div>
                  </div>
                );
              })}
              {bodyPartCounts.length === 0 && (
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", margin: "8px 0" }}>
                  データなし
                </p>
              )}
            </div>

            {/* Recent training list */}
            <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>直近の記録</div>
              {trainingLogs.slice().reverse().slice(0, 5).map((tl) => (
                <div key={tl.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 36 }}>
                    {`${new Date(tl.date + "T00:00").getMonth() + 1}/${new Date(tl.date + "T00:00").getDate()}`}
                  </span>
                  <div style={{ display: "flex", gap: 3, flex: 1, flexWrap: "wrap" }}>
                    {(tl.body_parts || []).map((p) => {
                      const info = BODY_PART_LABELS[p] || { label: p, color: "#a78bfa" };
                      return (
                        <span key={p} style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: `${info.color}20`, color: info.color }}>
                          {info.label}
                        </span>
                      );
                    })}
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={8} fill={i <= (tl.intensity || 0) ? "#fbbf24" : "transparent"} color={i <= (tl.intensity || 0) ? "#fbbf24" : "rgba(255,255,255,0.1)"} strokeWidth={1.5} />
                    ))}
                  </span>
                  {tl.duration_minutes && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono',monospace" }}>{tl.duration_minutes}m</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {chartData.length < 2 && chartData.length > 0 && (
          <div style={{ ...S.card, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              グラフは2日分以上のデータで表示されます
            </p>
          </div>
        )}

        {/* Input form */}
        <form id="form" onSubmit={handleSubmit} style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 6 }}><PenLine size={14} strokeWidth={1.5} />記録する</div>
            <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {["morning", "night"].map((tab) => (
                <button key={tab} type="button" onClick={() => setFormTab(tab)} style={{
                  padding: "5px 14px", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: formTab === tab
                    ? (tab === "morning" ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)")
                    : "transparent",
                  color: formTab === tab
                    ? (tab === "morning" ? "#4ade80" : "#f59e0b")
                    : "rgba(255,255,255,0.35)",
                  transition: "all 0.2s",
                }}>
                  {tab === "morning" ? "☀ 朝" : "🌙 夜"}
                </button>
              ))}
            </div>
          </div>

          {/* Date picker */}
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setDate(d => { const p = new Date(d); p.setDate(p.getDate() - 1); return p.toISOString().slice(0, 10); })} style={S.dateBtn}>◀</button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
            <button type="button" onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })} style={S.dateBtn}>▶</button>
            {date !== today() && (
              <button type="button" onClick={() => setDate(today())} style={{ ...S.dateBtn, fontSize: 10, padding: "4px 8px" }}>今日</button>
            )}
          </div>

          {/* Weight + Body Fat (tab-bound) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ ...S.fieldLabel, display: "flex", alignItems: "center", gap: 4 }}>
                <Scale size={12} strokeWidth={1.5} />体重 (kg)
              </label>
              <div style={S.numWrap}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="20"
                  max="300"
                  value={formTab === "morning" ? weight : nightWeight}
                  onChange={(e) => formTab === "morning" ? setWeight(e.target.value) : setNightWeight(e.target.value)}
                  placeholder="65.0"
                  style={{ ...S.numInput, color: formTab === "morning" ? "#4ade80" : "#f59e0b" }}
                  onWheel={(e) => e.target.blur()}
                />
                <span style={S.unit}>kg</span>
              </div>
            </div>
            <div>
              <label style={{ ...S.fieldLabel, display: "flex", alignItems: "center", gap: 4 }}>
                <BarChart3 size={12} strokeWidth={1.5} />体脂肪率 (%)
              </label>
              <div style={S.numWrap}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="1"
                  max="60"
                  value={formTab === "morning" ? bodyFat : nightBodyFat}
                  onChange={(e) => formTab === "morning" ? setBodyFat(e.target.value) : setNightBodyFat(e.target.value)}
                  placeholder="—"
                  style={{ ...S.numInput, color: formTab === "morning" ? "#4ade80" : "#f59e0b" }}
                  onWheel={(e) => e.target.blur()}
                />
                <span style={S.unit}>%</span>
              </div>
            </div>
          </div>

          {/* 朝夜サマリー */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 10, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {weight && <span>☀ <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{weight}</span>kg</span>}
            {nightWeight && <span>🌙 <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{nightWeight}</span>kg</span>}
            {weight && nightWeight && (
              <span style={{ color: "rgba(255,255,255,0.25)" }}>
                差 <span style={{ fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.5)" }}>
                  {(Number(nightWeight) - Number(weight) >= 0 ? "+" : "")}{(Number(nightWeight) - Number(weight)).toFixed(1)}
                </span>kg
              </span>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...S.fieldLabel, display: "flex", alignItems: "center", gap: 4 }}><PenLine size={12} strokeWidth={1.5} />体調メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="体調、食事、運動メモなど..."
              rows={2}
              style={S.notesInput}
            />
          </div>

          <button type="submit" disabled={saving || (!weight && !nightWeight)} style={{
            ...S.submitBtn,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: (!weight && !nightWeight) && !saving ? 0.5 : 1,
          }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </form>

        {/* Recent records list */}
        {metrics.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>直近の記録</div>
            {metrics.slice().reverse().slice(0, 10).map((m) => (
              <div key={m.id} style={S.logItem}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", minWidth: 40 }}>
                    {`${new Date(m.date + "T00:00").getMonth() + 1}/${new Date(m.date + "T00:00").getDate()}`}
                  </span>
                  {m.weight != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                      朝{Number(m.weight).toFixed(1)}
                    </span>
                  )}
                  {m.weight_night != null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono',monospace" }}>
                      夜{Number(m.weight_night).toFixed(1)}
                    </span>
                  )}
                  {m.body_fat != null && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", fontFamily: "'Space Mono',monospace" }}>
                      {Number(m.body_fat).toFixed(1)}%
                    </span>
                  )}
                </div>
                {m.notes && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 100 }}>
                    {m.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {metrics.length === 0 && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 32 }}>
            まだ記録がありません
          </p>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)",
          padding: "12px 24px", borderRadius: 12,
          background: toast.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.type === "success" ? "#4ade80" : "#f87171",
          fontSize: 14, fontWeight: 600, zIndex: 9999, animation: "fadeUp 0.3s ease-out",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) translateX(-50%); }
          to { opacity: 1; transform: translateY(0) translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)", color: "white", position: "relative", overflow: "hidden" },
  orb1: { position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle,rgba(34,197,94,0.06)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  orb2: { position: "fixed", bottom: -150, left: -150, width: 400, height: 400, background: "radial-gradient(circle,rgba(59,130,246,0.05)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  header: { padding: "18px 24px 10px", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 },
  backBtn: { padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  title: { fontSize: 18, fontWeight: 700, margin: 0, color: "rgba(255,255,255,0.85)" },
  main: { maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" },

  statsRow: { display: "flex", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 16px", textAlign: "center" },

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "20px 18px", marginBottom: 14 },

  dateBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  dateInput: { flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#4ade80", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 600, outline: "none", colorScheme: "dark" },

  fieldLabel: { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 },
  numWrap: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 10px" },
  numInput: { width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, textAlign: "right", minWidth: 0 },
  unit: { fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 },

  submitBtn: { width: "100%", padding: "12px 0", borderRadius: 12, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" },

  notesInput: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "rgba(255,255,255,0.7)", fontSize: 13, fontFamily: "'DM Sans','Noto Sans JP',sans-serif", outline: "none", resize: "vertical", minHeight: 44, boxSizing: "border-box" },

  logItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 4 },
};

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveBodyMetric, loadBodyMetrics, loadBodyMetricByDate } from "@/lib/db";
import { saveLocalBodyMetric, loadLocalBodyMetrics, loadLocalBodyMetricByDate } from "@/lib/local-db";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

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
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  // Chart data
  const [metrics, setMetrics] = useState([]);
  const [range, setRange] = useState(90); // 30, 90, 0 (all)

  // Auth (ゲストも許可)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user); // null = ゲスト
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [supabase]);

  // Load chart data
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadBodyMetrics(supabase, user.id, range || 3650).then(setMetrics);
    } else {
      setMetrics(loadLocalBodyMetrics(range || 3650));
    }
  }, [supabase, user, range, loading]);

  // Load existing data for selected date
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadBodyMetricByDate(supabase, user.id, date).then((m) => {
        if (m) {
          setWeight(m.weight != null ? String(m.weight) : "");
          setBodyFat(m.body_fat != null ? String(m.body_fat) : "");
          setNotes(m.notes || "");
        } else {
          setWeight("");
          setBodyFat("");
          setNotes("");
        }
      });
    } else {
      const m = loadLocalBodyMetricByDate(date);
      if (m) {
        setWeight(m.weight != null ? String(m.weight) : "");
        setBodyFat(m.body_fat != null ? String(m.body_fat) : "");
        setNotes(m.notes || "");
      } else {
        setWeight("");
        setBodyFat("");
        setNotes("");
      }
    }
  }, [supabase, user, date, loading]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!weight) return;

    setSaving(true);
    const metricData = {
      date,
      weight: Number(weight),
      bodyFat: bodyFat !== "" ? Number(bodyFat) : null,
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
      showToast("success", "記録しました！");
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
    bodyFat: m.body_fat != null ? Number(m.body_fat) : null,
  }));

  // Y-axis domains
  const weights = chartData.filter((d) => d.weight != null).map((d) => d.weight);
  const fats = chartData.filter((d) => d.bodyFat != null).map((d) => d.bodyFat);
  const wMin = weights.length ? Math.floor(Math.min(...weights) - 1) : 50;
  const wMax = weights.length ? Math.ceil(Math.max(...weights) + 1) : 80;
  const fMin = fats.length ? Math.floor(Math.min(...fats) - 2) : 5;
  const fMax = fats.length ? Math.ceil(Math.max(...fats) + 2) : 30;

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
            <div style={S.statCard}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>最新体重</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                {Number(latest.weight).toFixed(1)}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>kg</span>
              </div>
              {weightDiff && (
                <div style={{ fontSize: 10, color: Number(weightDiff) > 0 ? "#f87171" : "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                  {Number(weightDiff) > 0 ? "+" : ""}{weightDiff}kg
                </div>
              )}
            </div>
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

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[wMin, wMax]}
                    tick={{ fill: "#4ade80", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  {fats.length > 0 && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[fMin, fMax]}
                      tick={{ fill: "#60a5fa", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                  )}
                  <Tooltip
                    contentStyle={{
                      background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10, fontSize: 12, color: "#fff",
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                    formatter={(value, name) => {
                      if (name === "weight") return [`${value} kg`, "体重"];
                      if (name === "bodyFat") return [`${value} %`, "体脂肪率"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => label}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="weight"
                    stroke="#4ade80"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#4ade80" }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                  {fats.length > 0 && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bodyFat"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#60a5fa" }}
                      activeDot={{ r: 5 }}
                      connectNulls
                      strokeDasharray="5 3"
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 16, height: 2, background: "#4ade80", borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>体重 (kg)</span>
              </div>
              {fats.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 16, height: 2, background: "#60a5fa", borderRadius: 1, borderTop: "1px dashed #60a5fa" }} />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>体脂肪率 (%)</span>
                </div>
              )}
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
        <form onSubmit={handleSubmit} style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 12 }}>📝 記録する</div>

          {/* Date picker */}
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setDate(d => { const p = new Date(d); p.setDate(p.getDate() - 1); return p.toISOString().slice(0, 10); })} style={S.dateBtn}>◀</button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
            <button type="button" onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })} style={S.dateBtn}>▶</button>
            {date !== today() && (
              <button type="button" onClick={() => setDate(today())} style={{ ...S.dateBtn, fontSize: 10, padding: "4px 8px" }}>今日</button>
            )}
          </div>

          {/* Weight + Body Fat */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={S.fieldLabel}>⚖️ 体重 (kg)</label>
              <div style={S.numWrap}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="20"
                  max="300"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="65.0"
                  required
                  style={{ ...S.numInput, color: "#4ade80" }}
                  onWheel={(e) => e.target.blur()}
                />
                <span style={S.unit}>kg</span>
              </div>
            </div>
            <div>
              <label style={S.fieldLabel}>📊 体脂肪率 (%)</label>
              <div style={S.numWrap}>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="1"
                  max="60"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="—"
                  style={{ ...S.numInput, color: "#60a5fa" }}
                  onWheel={(e) => e.target.blur()}
                />
                <span style={S.unit}>%</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 14 }}>
            <label style={S.fieldLabel}>📝 体調メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="体調、食事、運動メモなど..."
              rows={2}
              style={S.notesInput}
            />
          </div>

          <button type="submit" disabled={saving || !weight} style={{
            ...S.submitBtn,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: !weight && !saving ? 0.5 : 1,
          }}>
            {saving ? "保存中..." : "💾 保存する"}
          </button>
        </form>

        {/* Recent records list */}
        {metrics.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>直近の記録</div>
            {metrics.slice().reverse().slice(0, 10).map((m) => (
              <div key={m.id} style={S.logItem}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", minWidth: 50 }}>
                    {`${new Date(m.date + "T00:00").getMonth() + 1}/${new Date(m.date + "T00:00").getDate()}`}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", fontFamily: "'Space Mono',monospace" }}>
                    {Number(m.weight).toFixed(1)}kg
                  </span>
                  {m.body_fat != null && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", fontFamily: "'Space Mono',monospace" }}>
                      {Number(m.body_fat).toFixed(1)}%
                    </span>
                  )}
                </div>
                {m.notes && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
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
  page: { minHeight: "100vh", background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)", fontFamily: "'DM Sans','Noto Sans JP',sans-serif", color: "white", position: "relative", overflow: "hidden" },
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

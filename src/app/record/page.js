"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveMealLog, loadMealLogs, deleteMealLog } from "@/lib/db";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordPage() {
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
  const [mealName, setMealName] = useState("");
  const [price, setPrice] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");

  // Today's logs
  const [logs, setLogs] = useState([]);
  const nameRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/");
        return;
      }
      setUser(user);
      setLoading(false);
    });
  }, [supabase, router]);

  // Load logs when date or user changes
  useEffect(() => {
    if (!user) return;
    loadMealLogs(supabase, user.id, date).then(setLogs);
  }, [supabase, user, date]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !mealName.trim()) return;

    setSaving(true);
    const saved = await saveMealLog(supabase, user.id, {
      date,
      mealName: mealName.trim(),
      price: price !== "" ? Number(price) : null,
      protein: protein !== "" ? Number(protein) : null,
      fat: fat !== "" ? Number(fat) : null,
      carbs: carbs !== "" ? Number(carbs) : null,
    });
    setSaving(false);

    if (saved) {
      showToast("success", "記録しました！");
      setLogs((prev) => [...prev, saved]);
      // Clear form (keep date)
      setMealName("");
      setPrice("");
      setProtein("");
      setFat("");
      setCarbs("");
      nameRef.current?.focus();
    } else {
      showToast("error", "保存に失敗しました");
    }
  };

  const handleDelete = async (logId) => {
    await deleteMealLog(supabase, user.id, logId);
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  // Totals
  const totals = logs.reduce(
    (acc, l) => ({
      price: acc.price + (l.price || 0),
      protein: acc.protein + (l.protein || 0),
      fat: acc.fat + (l.fat || 0),
      carbs: acc.carbs + (l.carbs || 0),
    }),
    { price: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const totalCal = Math.round(totals.protein * 4 + totals.fat * 9 + totals.carbs * 4);

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
        <h1 style={S.title}>食事記録</h1>
      </header>

      <main style={S.main}>
        {/* Date picker */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setDate(d => { const p = new Date(d); p.setDate(p.getDate() - 1); return p.toISOString().slice(0, 10); })} style={S.dateBtn}>◀</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
          <button onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })} style={S.dateBtn}>▶</button>
          {date !== today() && (
            <button onClick={() => setDate(today())} style={{ ...S.dateBtn, fontSize: 10, padding: "4px 8px" }}>今日</button>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} style={S.card}>
          <div style={S.formRow}>
            <input
              ref={nameRef}
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="食事名（例：鶏むね肉 200g）"
              required
              style={{ ...S.textInput, flex: 1 }}
              autoFocus
            />
          </div>

          <div style={S.gridRow}>
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>💰 金額</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="—" min="0" style={S.numInput} />
                <span style={S.unit}>円</span>
              </div>
            </div>
            <div style={S.fieldWrap}>
              <label style={{ ...S.fieldLabel, color: "#f87171" }}>P</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="—" min="0" style={{ ...S.numInput, color: "#f87171" }} />
                <span style={S.unit}>g</span>
              </div>
            </div>
            <div style={S.fieldWrap}>
              <label style={{ ...S.fieldLabel, color: "#facc15" }}>F</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="—" min="0" style={{ ...S.numInput, color: "#facc15" }} />
                <span style={S.unit}>g</span>
              </div>
            </div>
            <div style={S.fieldWrap}>
              <label style={{ ...S.fieldLabel, color: "#60a5fa" }}>C</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="—" min="0" style={{ ...S.numInput, color: "#60a5fa" }} />
                <span style={S.unit}>g</span>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving || !mealName.trim()} style={{
            ...S.submitBtn,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: !mealName.trim() && !saving ? 0.5 : 1,
          }}>
            {saving ? "記録中..." : "＋ 記録する"}
          </button>
        </form>

        {/* Today's summary */}
        {logs.length > 0 && (
          <div style={S.summaryCard}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
              {date === today() ? "今日" : new Date(date + "T00:00").toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}の合計
            </div>
            <div style={S.summaryGrid}>
              <div style={S.summaryItem}>
                <span style={{ color: "#4ade80", fontSize: 18, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{totalCal}</span>
                <span style={S.summaryLabel}>kcal</span>
              </div>
              <div style={S.summaryItem}>
                <span style={{ color: "#facc15", fontSize: 18, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>¥{totals.price.toLocaleString()}</span>
                <span style={S.summaryLabel}>金額</span>
              </div>
            </div>
            <div style={{ ...S.summaryGrid, marginTop: 8 }}>
              <div style={S.summaryItem}>
                <span style={{ color: "#f87171", fontSize: 15, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{Math.round(totals.protein)}g</span>
                <span style={S.summaryLabel}>P</span>
              </div>
              <div style={S.summaryItem}>
                <span style={{ color: "#facc15", fontSize: 15, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{Math.round(totals.fat)}g</span>
                <span style={S.summaryLabel}>F</span>
              </div>
              <div style={S.summaryItem}>
                <span style={{ color: "#60a5fa", fontSize: 15, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>{Math.round(totals.carbs)}g</span>
                <span style={S.summaryLabel}>C</span>
              </div>
            </div>
          </div>
        )}

        {/* Log list */}
        {logs.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {logs.map((log) => (
              <div key={log.id} style={S.logItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.meal_name}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, display: "flex", gap: 8 }}>
                    {log.price != null && <span>¥{log.price}</span>}
                    {log.protein != null && <span style={{ color: "#f87171" }}>P{log.protein}g</span>}
                    {log.fat != null && <span style={{ color: "#facc15" }}>F{log.fat}g</span>}
                    {log.carbs != null && <span style={{ color: "#60a5fa" }}>C{log.carbs}g</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(log.id)} style={S.deleteBtn} aria-label="削除">×</button>
              </div>
            ))}
          </div>
        )}

        {logs.length === 0 && (
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

  dateBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  dateInput: { flex: 1, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#4ade80", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 600, outline: "none", colorScheme: "dark" },

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "20px 18px", marginBottom: 14 },
  formRow: { marginBottom: 12 },
  textInput: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif" },

  gridRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  numWrap: { display: "flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 6px" },
  numInput: { width: "100%", background: "transparent", border: "none", outline: "none", color: "#22c55e", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, textAlign: "right", minWidth: 0 },
  unit: { fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0 },

  submitBtn: { width: "100%", padding: "12px 0", borderRadius: 12, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" },

  summaryCard: { background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 16, padding: "14px 16px", marginTop: 14 },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  summaryItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)" },

  logItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 6 },
  deleteBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

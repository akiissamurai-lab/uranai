"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveRoutineMeal, loadRoutineMeals, deleteRoutineMeal } from "@/lib/db";
import { saveLocalRoutineMeal, loadLocalRoutineMeals, deleteLocalRoutineMeal } from "@/lib/local-db";

const EMOJI_OPTIONS = ["🍱", "🍙", "🥗", "🍝", "🍖", "🥚", "🍜", "🥩", "🍲", "🥤", "🍛", "🥪", "🍕", "🌮", "🍣"];

export default function RoutinesPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [routines, setRoutines] = useState([]);

  // Form
  const [mealName, setMealName] = useState("");
  const [emoji, setEmoji] = useState("🍱");
  const [price, setPrice] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");

  // Auth (ゲストも許可) + load data
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user); // null = ゲスト
      if (user) {
        const data = await loadRoutineMeals(supabase, user.id);
        setRoutines(data);
      } else {
        setRoutines(loadLocalRoutineMeals());
      }
      setLoading(false);
    });
  }, [supabase]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!mealName.trim()) return;

    setSaving(true);
    const mealData = {
      mealName: mealName.trim(),
      emoji,
      price: price !== "" ? Number(price) : null,
      protein: protein !== "" ? Number(protein) : null,
      fat: fat !== "" ? Number(fat) : null,
      carbs: carbs !== "" ? Number(carbs) : null,
    };

    let saved;
    if (user) {
      saved = await saveRoutineMeal(supabase, user.id, mealData);
    } else {
      saved = saveLocalRoutineMeal(mealData);
    }
    setSaving(false);

    if (saved) {
      showToast("success", "ルーティンを追加しました！");
      setRoutines((prev) => [...prev, saved]);
      setMealName("");
      setEmoji("🍱");
      setPrice("");
      setProtein("");
      setFat("");
      setCarbs("");
    } else {
      showToast("error", "追加に失敗しました");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    if (user) {
      await deleteRoutineMeal(supabase, user.id, id);
    } else {
      deleteLocalRoutineMeal(id);
    }
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    showToast("success", "削除しました");
  };

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
        <h1 style={S.title}>マイルーティン飯</h1>
      </header>

      <main style={S.main}>

        {/* Info */}
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 14, lineHeight: 1.6 }}>
          定番メニューを登録しておくと、記録画面でワンタップ入力できます
        </div>

        {/* Routine list */}
        {routines.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {routines.map((r) => (
              <div key={r.id} style={S.routineCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 26 }}>{r.emoji || "🍱"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.meal_name}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                      {r.price != null && (
                        <span style={S.badge}>¥{Number(r.price).toLocaleString()}</span>
                      )}
                      {r.protein != null && (
                        <span style={{ ...S.badge, color: "#f87171" }}>P{Number(r.protein).toFixed(0)}</span>
                      )}
                      {r.fat != null && (
                        <span style={{ ...S.badge, color: "#facc15" }}>F{Number(r.fat).toFixed(0)}</span>
                      )}
                      {r.carbs != null && (
                        <span style={{ ...S.badge, color: "#60a5fa" }}>C{Number(r.carbs).toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(r.id, r.meal_name)} style={S.deleteBtn}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {routines.length === 0 && (
          <div style={{ ...S.card, textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
              まだルーティンがありません
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "4px 0 0" }}>
              下のフォームから追加してください
            </p>
          </div>
        )}

        {/* Add form */}
        <form onSubmit={handleAdd} style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>➕ 新しいルーティンを追加</div>

          {/* Emoji picker */}
          <div style={{ marginBottom: 12 }}>
            <label style={S.fieldLabel}>アイコン</label>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 36, height: 36, borderRadius: 8, border: "none",
                    background: emoji === e ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.04)",
                    fontSize: 18, cursor: "pointer",
                    outline: emoji === e ? "2px solid #4ade80" : "1px solid rgba(255,255,255,0.08)",
                    transition: "all 0.15s",
                  }}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Meal name */}
          <div style={{ marginBottom: 12 }}>
            <label style={S.fieldLabel}>メニュー名（必須）</label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="例: サラダチキン定食"
              required
              style={S.textInput}
            />
          </div>

          {/* Price + PFC grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={S.fieldLabel}>💰 金額 (円)</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="numeric" min="0" max="99999" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="500" style={{ ...S.numInput, color: "#4ade80" }} onWheel={(e) => e.target.blur()} />
                <span style={S.unit}>円</span>
              </div>
            </div>
            <div>
              <label style={S.fieldLabel}>🥩 タンパク質 (g)</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" step="0.1" min="0" max="999" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="30" style={{ ...S.numInput, color: "#f87171" }} onWheel={(e) => e.target.blur()} />
                <span style={S.unit}>g</span>
              </div>
            </div>
            <div>
              <label style={S.fieldLabel}>🧈 脂質 (g)</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" step="0.1" min="0" max="999" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="15" style={{ ...S.numInput, color: "#facc15" }} onWheel={(e) => e.target.blur()} />
                <span style={S.unit}>g</span>
              </div>
            </div>
            <div>
              <label style={S.fieldLabel}>🍚 炭水化物 (g)</label>
              <div style={S.numWrap}>
                <input type="number" inputMode="decimal" step="0.1" min="0" max="999" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="50" style={{ ...S.numInput, color: "#60a5fa" }} onWheel={(e) => e.target.blur()} />
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
            {saving ? "追加中..." : "✅ ルーティンを追加"}
          </button>
        </form>

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

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "20px 18px", marginBottom: 14 },

  routineCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    padding: "14px 16px", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, marginBottom: 8,
  },
  badge: { fontSize: 10, fontWeight: 600, color: "#4ade80", fontFamily: "'Space Mono',monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 6 },
  deleteBtn: { padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)", fontSize: 14, cursor: "pointer", flexShrink: 0, transition: "all 0.15s" },

  fieldLabel: { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 },
  textInput: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)", fontSize: 14, outline: "none", boxSizing: "border-box" },
  numWrap: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 10px" },
  numInput: { width: "100%", background: "transparent", border: "none", outline: "none", fontFamily: "'Space Mono',monospace", fontSize: 16, fontWeight: 700, textAlign: "right", minWidth: 0 },
  unit: { fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 },

  submitBtn: { width: "100%", padding: "12px 0", borderRadius: 12, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(34,197,94,0.3)" },
};

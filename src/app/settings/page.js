"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { loadProfile, saveProfile } from "@/lib/db";

export default function SettingsPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success" | "error", msg }

  const [goalWeight, setGoalWeight] = useState("");
  const [budget, setBudget] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace("/");
        return;
      }
      setUser(user);

      const profile = await loadProfile(supabase, user.id);
      if (profile) {
        setGoalWeight(profile.goal_weight ?? "");
        setBudget(profile.budget ?? "");
        setProteinGoal(profile.protein_goal ?? "");
        setFatGoal(profile.fat_goal ?? "");
        setCarbsGoal(profile.carbs_goal ?? "");
      }
      setLoading(false);
    });
  }, [supabase, router]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await saveProfile(supabase, user.id, {
        goalWeight: goalWeight !== "" ? Number(goalWeight) : null,
        budget: budget !== "" ? Number(budget) : null,
        proteinGoal: proteinGoal !== "" ? Number(proteinGoal) : null,
        fatGoal: fatGoal !== "" ? Number(fatGoal) : null,
        carbsGoal: carbsGoal !== "" ? Number(carbsGoal) : null,
      });
      showToast("success", "保存しました！");
    } catch {
      showToast("error", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Background orbs */}
      <div style={{ position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle,rgba(34,197,94,0.06)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -150, left: -150, width: 400, height: 400, background: "radial-gradient(circle,rgba(59,130,246,0.05)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => router.push("/")} style={styles.backBtn} aria-label="戻る">
          ← 戻る
        </button>
        <h1 style={styles.title}>プロフィール設定</h1>
      </header>

      <main style={styles.main}>
        <form onSubmit={handleSave}>
          {/* 目標体重 */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🎯 目標体重</h2>
            <div style={styles.inputRow}>
              <label style={styles.label}>目標体重</label>
              <div style={styles.inputWrap}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={goalWeight}
                  onChange={(e) => setGoalWeight(e.target.value)}
                  placeholder="—"
                  step="0.1"
                  min="30"
                  max="200"
                  style={styles.input}
                />
                <span style={styles.suffix}>kg</span>
              </div>
            </div>
          </div>

          {/* 食費予算 */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>💰 1日の食費予算</h2>
            <div style={styles.inputRow}>
              <label style={styles.label}>予算</label>
              <div style={styles.inputWrap}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="—"
                  step="100"
                  min="0"
                  max="10000"
                  style={styles.input}
                />
                <span style={styles.suffix}>円/日</span>
              </div>
            </div>
          </div>

          {/* PFC バランス */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>⚡ PFCバランス目標</h2>
            <p style={styles.hint}>設定するとメインページの自動計算を上書きします</p>

            <div style={styles.inputRow}>
              <label style={{ ...styles.label, color: "#f87171" }}>P タンパク質</label>
              <div style={styles.inputWrap}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={proteinGoal}
                  onChange={(e) => setProteinGoal(e.target.value)}
                  placeholder="—"
                  min="0"
                  max="500"
                  style={{ ...styles.input, color: "#f87171" }}
                />
                <span style={styles.suffix}>g</span>
              </div>
            </div>

            <div style={styles.inputRow}>
              <label style={{ ...styles.label, color: "#facc15" }}>F 脂質</label>
              <div style={styles.inputWrap}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={fatGoal}
                  onChange={(e) => setFatGoal(e.target.value)}
                  placeholder="—"
                  min="0"
                  max="500"
                  style={{ ...styles.input, color: "#facc15" }}
                />
                <span style={styles.suffix}>g</span>
              </div>
            </div>

            <div style={styles.inputRow}>
              <label style={{ ...styles.label, color: "#60a5fa" }}>C 炭水化物</label>
              <div style={styles.inputWrap}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={carbsGoal}
                  onChange={(e) => setCarbsGoal(e.target.value)}
                  placeholder="—"
                  min="0"
                  max="1000"
                  style={{ ...styles.input, color: "#60a5fa" }}
                />
                <span style={styles.suffix}>g</span>
              </div>
            </div>
          </div>

          {/* 保存ボタン */}
          <button type="submit" disabled={saving} style={{
            ...styles.saveBtn,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "保存中..." : "保存する"}
          </button>
        </form>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "12px 24px",
          borderRadius: 12,
          background: toast.type === "success" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.type === "success" ? "#4ade80" : "#f87171",
          fontSize: 14,
          fontWeight: 600,
          zIndex: 9999,
          animation: "fadeUp 0.3s ease-out",
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

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)",
    fontFamily: "'DM Sans','Noto Sans JP',sans-serif",
    color: "white",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    padding: "18px 24px 10px",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: "rgba(255,255,255,0.85)",
  },
  main: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 16px 100px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: "22px 20px",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    margin: "0 0 16px",
  },
  hint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    margin: "-8px 0 16px",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "rgba(255,255,255,0.5)",
  },
  inputWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "7px 10px",
  },
  input: {
    width: 80,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#22c55e",
    fontFamily: "'Space Mono',monospace",
    fontSize: 17,
    fontWeight: 700,
    textAlign: "right",
  },
  suffix: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  saveBtn: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    border: "none",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginTop: 8,
    boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
  },
};

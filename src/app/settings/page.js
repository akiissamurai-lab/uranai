"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { loadProfile, saveProfile, isDbError } from "@/lib/db";
import { loadLocalProfile, saveLocalProfile } from "@/lib/local-db";
import { Target, Wallet, Zap, Flame, UtensilsCrossed, ScrollText, Lock, ChevronDown, MessageSquare, User, Trash2, AlertTriangle, HelpCircle } from "lucide-react";
import { LegalViewer } from "@/components/TermsModal";

/* ── Inline Warning ── */
function InlineWarning({ message }) {
  if (!message) return null;
  return (
    <div style={{
      marginTop: 10, padding: "8px 12px", borderRadius: 10,
      background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)",
      fontSize: 11, color: "#fbbf24", lineHeight: 1.6,
      display: "flex", alignItems: "flex-start", gap: 6,
    }}>
      <span style={{ flexShrink: 0, fontSize: 13 }}>!</span>
      <span>{message}</span>
    </div>
  );
}

/* ── FAQ Section ── */
const FAQ_ITEMS = [
  { q: "食事の記録はどうやるの？", a: "検索欄に「鶏むね肉」などと入力するだけで、AIがPFCと価格を瞬時に推測します。手動での入力も可能です。" },
  { q: "すべて無料で使えますか？", a: "はい、現在の機能はすべて無料でご利用いただけます。" },
  { q: "「予算最適化」とは何ですか？", a: "目標のPFCを満たしつつ、1日の食費をいかに安く抑えるかをAIがアドバイスする、当アプリ独自の機能です。" },
  { q: "アカウントやデータは削除できますか？", a: "はい。この設定画面の下部から、いつでもアカウントと全データを完全に削除できます。" },
];

function FaqSection() {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, justifyContent: "center" }}>
        <HelpCircle size={16} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>よくある質問</span>
      </div>
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        overflow: "hidden",
      }}>
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div key={i} style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer",
                  textAlign: "left", gap: 10,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                  {item.q}
                </span>
                <ChevronDown size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" style={{
                  flexShrink: 0, transition: "transform 0.2s ease",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }} />
              </button>
              <div style={{
                maxHeight: isOpen ? 200 : 0,
                overflow: "hidden",
                transition: "max-height 0.25s ease, opacity 0.2s ease",
                opacity: isOpen ? 1 : 0,
              }}>
                <p style={{
                  margin: 0, padding: "0 18px 16px",
                  fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.4)",
                }}>
                  {item.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Stepper Component (tap-to-edit) ── */
function Stepper({ value, onChange, min, max, step = 1, color = "#22c55e", unit = "", large = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const numVal = value !== "" && value != null ? Number(value) : null;
  const canDec = numVal != null && numVal > min;
  const canInc = numVal == null || numVal < max;

  const handleDec = () => {
    if (numVal == null) return;
    onChange(Math.max(min, +(numVal - step).toFixed(4)));
  };
  const handleInc = () => {
    if (numVal == null) onChange(min);
    else onChange(Math.min(max, +(numVal + step).toFixed(4)));
  };

  const startEdit = () => {
    setDraft(numVal != null ? String(numVal) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };
  const commitEdit = () => {
    setEditing(false);
    if (draft === "") { onChange(""); return; }
    const n = parseFloat(draft);
    if (isNaN(n)) { onChange(""); return; }
    onChange(Math.max(min, Math.min(max, +n.toFixed(4))));
  };

  const btnStyle = (enabled) => ({
    width: large ? 52 : 44, height: large ? 52 : 44, borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.1)",
    background: enabled ? "rgba(255,255,255,0.06)" : "transparent",
    color: enabled ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.12)",
    fontSize: large ? 24 : 20, cursor: enabled ? "pointer" : "not-allowed",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: large ? 20 : 14 }}>
      <button type="button" onClick={handleDec} disabled={!canDec} style={btnStyle(canDec)}>−</button>
      <div
        onClick={!editing ? startEdit : undefined}
        style={{ textAlign: "center", minWidth: large ? 100 : 70, cursor: editing ? "default" : "pointer" }}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
            style={{
              width: large ? 100 : 70, background: "rgba(255,255,255,0.06)",
              border: `1.5px solid ${color}40`, borderRadius: 10, outline: "none",
              color, fontFamily: "'Space Mono',monospace",
              fontSize: large ? 30 : 22, fontWeight: 700, textAlign: "center",
              padding: "4px 0",
            }}
          />
        ) : (
          <>
            <span style={{
              fontSize: large ? 36 : 28, fontWeight: 800,
              color: numVal != null ? color : "rgba(255,255,255,0.15)",
              fontFamily: "'Space Mono',monospace",
              borderBottom: `1.5px dashed ${numVal != null ? color + "30" : "rgba(255,255,255,0.06)"}`,
              paddingBottom: 2,
            }}>
              {numVal != null ? numVal : "—"}
            </span>
            {unit && <span style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>{unit}</span>}
          </>
        )}
      </div>
      <button type="button" onClick={handleInc} disabled={!canInc} style={btnStyle(canInc)}>+</button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [goalWeight, setGoalWeight] = useState("");
  const [budget, setBudget] = useState("");
  const [proteinGoal, setProteinGoal] = useState("");
  const [fatGoal, setFatGoal] = useState("");
  const [carbsGoal, setCarbsGoal] = useState("");
  const [mealCount, setMealCount] = useState(3);
  const [calorieGoal, setCalorieGoal] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [goalBodyFat, setGoalBodyFat] = useState("");
  const [legalTab, setLegalTab] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden, 1=confirm, 2=typing
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Progressive disclosure: PFC hidden by default unless already set
  const [pfcOpen, setPfcOpen] = useState(false);

  useEffect(() => {
    const authTimeout = setTimeout(() => {
      const p = loadLocalProfile();
      if (p) {
        setGoalWeight(p.goal_weight ?? ""); setBudget(p.budget ?? "");
        setProteinGoal(p.protein_goal ?? ""); setFatGoal(p.fat_goal ?? ""); setCarbsGoal(p.carbs_goal ?? "");
        setMealCount(p.meal_count ?? 3); setCalorieGoal(p.calorie_goal ?? "");
        setGender(p.gender ?? ""); setAge(p.age ?? ""); setGoalBodyFat(p.goal_body_fat ?? "");
        if (p.protein_goal || p.fat_goal || p.carbs_goal || p.calorie_goal) setPfcOpen(true);
        if (p.gender || p.age) setProfileOpen(true);
      }
      setLoading(false);
    }, 5000);
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      clearTimeout(authTimeout);
      setUser(user);

      let profile;
      if (user) {
        profile = await loadProfile(supabase, user.id);
      } else {
        profile = loadLocalProfile();
      }
      if (profile) {
        setGoalWeight(profile.goal_weight ?? "");
        setBudget(profile.budget ?? "");
        setProteinGoal(profile.protein_goal ?? "");
        setFatGoal(profile.fat_goal ?? "");
        setCarbsGoal(profile.carbs_goal ?? "");
        setMealCount(profile.meal_count ?? 3);
        setCalorieGoal(profile.calorie_goal ?? "");
        setGender(profile.gender ?? ""); setAge(profile.age ?? ""); setGoalBodyFat(profile.goal_body_fat ?? "");
        if (profile.protein_goal || profile.fat_goal || profile.carbs_goal || profile.calorie_goal) setPfcOpen(true);
        if (profile.gender || profile.age) setProfileOpen(true);
      }
      setLoading(false);
    }).catch(() => {
      clearTimeout(authTimeout);
      const p = loadLocalProfile();
      if (p) {
        setGoalWeight(p.goal_weight ?? ""); setBudget(p.budget ?? "");
        setProteinGoal(p.protein_goal ?? ""); setFatGoal(p.fat_goal ?? ""); setCarbsGoal(p.carbs_goal ?? "");
        setMealCount(p.meal_count ?? 3); setCalorieGoal(p.calorie_goal ?? "");
        setGender(p.gender ?? ""); setAge(p.age ?? ""); setGoalBodyFat(p.goal_body_fat ?? "");
        if (p.protein_goal || p.fat_goal || p.carbs_goal || p.calorie_goal) setPfcOpen(true);
        if (p.gender || p.age) setProfileOpen(true);
      }
      setLoading(false);
    });
    return () => clearTimeout(authTimeout);
  }, [supabase]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    // [1-2] UIタイムアウトガード
    const uiTimeout = setTimeout(() => { setSaving(false); showToast("error", "タイムアウト: 接続を確認してください"); }, 20000);
    try {
      const data = {
        goalWeight: goalWeight !== "" ? Number(goalWeight) : null,
        budget: budget !== "" ? Number(budget) : null,
        proteinGoal: proteinGoal !== "" ? Number(proteinGoal) : null,
        fatGoal: fatGoal !== "" ? Number(fatGoal) : null,
        carbsGoal: carbsGoal !== "" ? Number(carbsGoal) : null,
        calorieGoal: calorieGoal !== "" ? Number(calorieGoal) : null,
        mealCount: mealCount,
        gender: gender || null,
        age: age !== "" ? Number(age) : null,
        goalBodyFat: goalBodyFat !== "" ? Number(goalBodyFat) : null,
      };
      let saveResult;
      if (user) {
        saveResult = await saveProfile(supabase, user.id, data);
      } else {
        saveResult = saveLocalProfile({
          goal_weight: data.goalWeight,
          budget: data.budget,
          protein_goal: data.proteinGoal,
          fat_goal: data.fatGoal,
          carbs_goal: data.carbsGoal,
          calorie_goal: data.calorieGoal,
          meal_count: data.mealCount,
          gender: data.gender,
          age: data.age,
          goal_body_fat: data.goalBodyFat,
        });
      }
      if (isDbError(saveResult)) { showToast("error", "保存に失敗: " + saveResult._error); }
      else { showToast("success", "保存しました"); }
    } catch {
      showToast("error", "保存できませんでした");
    } finally {
      clearTimeout(uiTimeout);
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "削除") return;
    setDeleting(true);
    try {
      // [1-1] アカウント削除にもタイムアウト追加
      const res = await fetch("/api/user/delete", { method: "POST", signal: AbortSignal.timeout(20000) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast("error", body.error || "削除に失敗しました");
        setDeleting(false);
        return;
      }
      // ローカルデータもクリア
      localStorage.clear();
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      showToast("error", "削除できませんでした");
      setDeleting(false);
    }
  };

  if (loading) {
    const sk = { background: "rgba(255,255,255,0.04)", borderRadius: 12, animation: "shimmer 1.5s ease-in-out infinite" };
    return (
      <div style={styles.page}>
        <div style={styles.orb1} /><div style={styles.orb2} />
        <header style={styles.header}>
          <div style={{ ...sk, width: 60, height: 36, borderRadius: 10 }} />
          <div style={{ ...sk, width: 50, height: 24, borderRadius: 8 }} />
        </header>
        <main style={styles.main}>
          {/* Settings fields skeleton */}
          {[1,2,3].map(i => (
            <div key={i} style={{ ...sk, height: 80, borderRadius: 22, marginBottom: 18, animationDelay: `${i * 0.12}s` }} />
          ))}
          {/* PFC accordion skeleton */}
          <div style={{ ...sk, height: 56, borderRadius: 22, marginBottom: 18, animationDelay: "0.36s" }} />
          {/* Save button skeleton */}
          <div style={{ ...sk, height: 54, borderRadius: 14, marginTop: 8 }} />
        </main>
        <style>{`@keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
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
        <h1 style={styles.title}>設定</h1>
      </header>

      <main style={styles.main}>
        <form onSubmit={handleSave}>

          {/* ── 目標体重・体脂肪率 ── */}
          <div style={styles.card}>
            <div style={styles.cardLabel}>
              <Target size={16} strokeWidth={1.5} color="#4ade80" />
              <span>目標体重</span>
            </div>
            <Stepper
              value={goalWeight} onChange={setGoalWeight}
              min={30} max={200} step={0.5}
              color="#4ade80" unit="kg" large
            />
            <InlineWarning message={
              goalWeight !== "" && Number(goalWeight) < 45
                ? "目標体重が45kg未満です。低体重は健康リスクがあります。医師にご相談ください。"
                : null
            } />
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 18, paddingTop: 18 }}>
              <div style={{ ...styles.cardLabel, marginBottom: 10 }}>
                <Target size={16} strokeWidth={1.5} color="#60a5fa" />
                <span>目標体脂肪率</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>任意</span>
              </div>
              <Stepper
                value={goalBodyFat} onChange={setGoalBodyFat}
                min={3} max={50} step={0.5}
                color="#60a5fa" unit="%" large
              />
            </div>
          </div>

          {/* ── プロフィール（任意）── */}
          <div style={styles.card}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              style={styles.accordionBtn}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <User size={16} strokeWidth={1.5} color="#f472b6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>プロフィール</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>任意</span>
                {!profileOpen && (gender || age) && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                    {gender === "male" ? "男性" : gender === "female" ? "女性" : ""}{gender && age ? " / " : ""}{age ? `${age}歳` : ""}
                  </span>
                )}
              </div>
              <ChevronDown size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{
                transition: "transform 0.25s ease",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
              }} />
            </button>

            <div style={{
              maxHeight: profileOpen ? 300 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease, opacity 0.25s ease",
              opacity: profileOpen ? 1 : 0,
            }}>
              <div style={{ paddingTop: 20 }}>
                {/* Gender */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>性別</div>
                  <div style={{ display: "flex", gap: 0, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {[{ val: "", label: "未設定" }, { val: "male", label: "男性" }, { val: "female", label: "女性" }].map(opt => (
                      <button key={opt.val} type="button" onClick={() => setGender(opt.val)} style={{
                        flex: 1, padding: "10px 0", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        background: gender === opt.val ? "rgba(244,114,182,0.15)" : "transparent",
                        color: gender === opt.val ? "#f472b6" : "rgba(255,255,255,0.3)",
                        transition: "all 0.2s",
                      }}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                {/* Age */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>年齢</div>
                  <Stepper value={age} onChange={setAge} min={10} max={100} step={1} color="#f472b6" unit="歳" />
                </div>
              </div>
            </div>
          </div>

          {/* ── 1日の食費 ── */}
          <div style={styles.card}>
            <div style={styles.cardLabel}>
              <Wallet size={16} strokeWidth={1.5} color="#facc15" />
              <span>1日の食費</span>
            </div>
            <Stepper
              value={budget} onChange={setBudget}
              min={0} max={10000} step={100}
              color="#facc15" unit="円" large
            />
            <InlineWarning message={
              budget !== "" && Number(budget) > 0 && Number(budget) < 500
                ? "1日500円未満では十分な栄養を確保するのが困難です。"
                : null
            } />
          </div>

          {/* ── 食事の回数 ── */}
          <div style={styles.card}>
            <div style={styles.cardLabel}>
              <UtensilsCrossed size={16} strokeWidth={1.5} color="#60a5fa" />
              <span>食事の回数</span>
            </div>
            <Stepper
              value={mealCount} onChange={setMealCount}
              min={2} max={5} step={1}
              color="#60a5fa" unit="回" large
            />
          </div>

          {/* ── PFC 目標（折りたたみ）── */}
          <div style={styles.card}>
            <button
              type="button"
              onClick={() => setPfcOpen(!pfcOpen)}
              style={styles.accordionBtn}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={16} strokeWidth={1.5} color="#a78bfa" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>PFC・カロリー目標</span>
                {!pfcOpen && (proteinGoal || fatGoal || carbsGoal || calorieGoal) && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                    {proteinGoal ? `P${proteinGoal}` : ""}{fatGoal ? ` F${fatGoal}` : ""}{carbsGoal ? ` C${carbsGoal}` : ""}{calorieGoal ? ` ${calorieGoal}kcal` : ""}
                  </span>
                )}
              </div>
              <ChevronDown size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{
                transition: "transform 0.25s ease",
                transform: pfcOpen ? "rotate(180deg)" : "rotate(0deg)",
              }} />
            </button>

            <div style={{
              maxHeight: pfcOpen ? 500 : 0,
              overflow: "hidden",
              transition: "max-height 0.3s ease, opacity 0.25s ease",
              opacity: pfcOpen ? 1 : 0,
            }}>
              <div style={{ paddingTop: 20 }}>
                {/* P */}
                <div style={styles.pfcRow}>
                  <div style={{ ...styles.pfcDot, background: "#f87171" }} />
                  <span style={{ ...styles.pfcLabel, color: "#f87171" }}>P</span>
                  <Stepper value={proteinGoal} onChange={setProteinGoal} min={0} max={500} step={5} color="#f87171" unit="g" />
                </div>

                {/* F */}
                <div style={styles.pfcRow}>
                  <div style={{ ...styles.pfcDot, background: "#facc15" }} />
                  <span style={{ ...styles.pfcLabel, color: "#facc15" }}>F</span>
                  <Stepper value={fatGoal} onChange={setFatGoal} min={0} max={300} step={5} color="#facc15" unit="g" />
                </div>

                {/* C */}
                <div style={styles.pfcRow}>
                  <div style={{ ...styles.pfcDot, background: "#60a5fa" }} />
                  <span style={{ ...styles.pfcLabel, color: "#60a5fa" }}>C</span>
                  <Stepper value={carbsGoal} onChange={setCarbsGoal} min={0} max={1000} step={5} color="#60a5fa" unit="g" />
                </div>

                {/* Calorie */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20 }}>
                  <div style={styles.pfcRow}>
                    <Flame size={14} strokeWidth={1.5} color="#f97316" style={{ flexShrink: 0 }} />
                    <span style={{ ...styles.pfcLabel, color: "#f97316", width: "auto", fontSize: 13 }}>Cal</span>
                    <Stepper value={calorieGoal} onChange={setCalorieGoal} min={0} max={8000} step={50} color="#f97316" unit="kcal" />
                  </div>
                  <InlineWarning message={
                    calorieGoal !== "" && Number(calorieGoal) > 0 && Number(calorieGoal) < 1200
                      ? "1200kcal未満の極端なカロリー制限は筋量低下・代謝障害のリスクがあります。医師にご相談ください。"
                      : null
                  } />
                </div>
              </div>
            </div>
          </div>

          {/* Save */}
          <button type="submit" disabled={saving} style={{
            ...styles.saveBtn,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "保存中..." : "保存する"}
          </button>
        </form>

        {/* Feedback */}
        <a
          href="https://docs.google.com/forms/d/1KlfxBPlE7BVeWcnD8vbXTZte2qfSQBm6P7cwKZ8fV-k/edit?hl=ja"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.feedbackLink}
        >
          <MessageSquare size={18} strokeWidth={1.5} color="#a78bfa" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>フィードバックを送る</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>バグ報告・機能要望</div>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 14, color: "rgba(255,255,255,0.2)" }}>›</span>
        </a>

        {/* ── FAQ ── */}
        <FaqSection />

        {/* Legal links */}
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 4, paddingBottom: 8 }}>
          <button onClick={() => setLegalTab("terms")} style={styles.legalBtn}>
            <ScrollText size={12} strokeWidth={1.5} />
            利用規約
          </button>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 12, lineHeight: "36px" }}>|</span>
          <button onClick={() => setLegalTab("privacy")} style={styles.legalBtn}>
            <Lock size={12} strokeWidth={1.5} />
            プライバシーポリシー
          </button>
        </div>

        {/* ── アカウント削除 ── */}
        {user && (
          <div style={{
            marginTop: 32,
            padding: "20px 18px",
            borderRadius: 16,
            border: "1px solid rgba(239,68,68,0.15)",
            background: "rgba(239,68,68,0.03)",
          }}>
            {deleteStep === 0 && (
              <button
                onClick={() => setDeleteStep(1)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 0", borderRadius: 10,
                  border: "1px solid rgba(239,68,68,0.2)", background: "transparent",
                  color: "rgba(239,68,68,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                <Trash2 size={14} strokeWidth={1.5} />
                アカウントを削除する
              </button>
            )}

            {deleteStep === 1 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="#f87171" strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>本当に削除しますか？</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: "0 0 14px" }}>
                  アカウントを削除すると、体重記録・食事ログ・トレーニング記録・プロフィール設定など、すべてのデータが完全に削除されます。この操作は取り消せません。
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => setDeleteStep(0)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                      color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => setDeleteStep(2)}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)",
                      color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    削除に進む
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={16} color="#f87171" strokeWidth={1.5} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>最終確認</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: "0 0 12px" }}>
                  確認のため「削除」と入力してください。
                </p>
                <input
                  type="text"
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="削除"
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 10, boxSizing: "border-box",
                    border: "1px solid rgba(239,68,68,0.2)", background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 14, outline: "none", marginBottom: 12,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setDeleteStep(0); setDeleteInput(""); }}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
                      color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== "削除" || deleting}
                    style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
                      background: deleteInput === "削除" && !deleting ? "#dc2626" : "rgba(255,255,255,0.08)",
                      color: deleteInput === "削除" && !deleting ? "#fff" : "rgba(255,255,255,0.2)",
                      fontSize: 13, fontWeight: 700,
                      cursor: deleteInput === "削除" && !deleting ? "pointer" : "not-allowed",
                    }}
                  >
                    {deleting ? "削除中..." : "完全に削除する"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {legalTab && <LegalViewer initialTab={legalTab} onClose={() => setLegalTab(null)} />}

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

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)",
    color: "white",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px 12px",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: "8px 14px",
    borderRadius: 10,
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
    padding: "8px 16px 100px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 22,
    padding: "28px 24px",
    marginBottom: 20,
  },
  cardLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    fontSize: 15,
    fontWeight: 600,
    color: "rgba(255,255,255,0.6)",
    justifyContent: "center",
  },
  accordionBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  pfcRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  pfcDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  pfcLabel: {
    fontSize: 15,
    fontWeight: 700,
    width: 20,
    flexShrink: 0,
  },
  saveBtn: {
    width: "100%",
    padding: "16px 0",
    borderRadius: 16,
    border: "none",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 0.5,
    marginTop: 12,
    boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
  },
  feedbackLink: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginTop: 32,
    padding: "18px 20px",
    borderRadius: 16,
    border: "1px solid rgba(168,139,250,0.12)",
    background: "rgba(168,139,250,0.04)",
    textDecoration: "none",
    transition: "all 0.2s",
  },
  legalBtn: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 12px",
  },
};

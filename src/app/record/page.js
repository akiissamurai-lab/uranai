"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveMealLog, loadMealLogs, deleteMealLog, loadProfile, loadRoutineMeals, saveDailyNotes, loadBodyMetricByDate, saveBodyMetric, saveTrainingLog, loadTrainingLogsByDate, deleteTrainingLog } from "@/lib/db";
import { saveLocalMealLog, loadLocalMealLogs, deleteLocalMealLog, loadLocalRoutineMeals, loadLocalProfile, saveLocalDailyNotes, loadLocalBodyMetricByDate, saveLocalBodyMetric, saveLocalTrainingLog, loadLocalTrainingLogsByDate, deleteLocalTrainingLog } from "@/lib/local-db";
import { BarChart3, Wallet, Zap, UtensilsCrossed, Plus, PenLine, Scale, Dumbbell, Star, Clock, Trash2 } from "lucide-react";

const BODY_PART_OPTIONS = [
  { id: "chest", label: "胸", color: "#f87171" },
  { id: "back", label: "背中", color: "#60a5fa" },
  { id: "shoulders", label: "肩", color: "#fbbf24" },
  { id: "arms", label: "腕", color: "#a78bfa" },
  { id: "legs", label: "脚", color: "#4ade80" },
  { id: "abs", label: "腹", color: "#f472b6" },
  { id: "cardio", label: "有酸素", color: "#22d3ee" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ProgressRing({ label, value, max, color, unit }) {
  if (!max) return null;
  const pct = Math.min((value / max) * 100, 100);
  const over = value > max;
  const r = 32, c = 2 * Math.PI * r, off = c - (pct / 100) * c;
  const ringColor = over ? "#ef4444" : color;
  const remaining = max - value;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={76} height={76} viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={ringColor} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={off}
          strokeLinecap="round" transform="rotate(-90 38 38)"
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }} />
        <text x="38" y="35" textAnchor="middle" fill={ringColor} fontSize="13" fontWeight="700" fontFamily="'Space Mono',monospace">
          {Math.round(value)}
        </text>
        <text x="38" y="48" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="9">
          /{max}{unit}
        </text>
      </svg>
      <span style={{ fontSize: 12, fontWeight: 700, color: ringColor }}>{label}</span>
      <span style={{ fontSize: 10, color: over ? "#ef4444" : "rgba(255,255,255,0.35)" }}>
        {over ? `+${Math.round(value - max)}${unit} オーバー` : `残り ${Math.round(remaining)}${unit}`}
      </span>
    </div>
  );
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

  // Goals from profile
  const [goals, setGoals] = useState(null);

  // Routines
  const [routines, setRoutines] = useState([]);
  const [savingRoutineId, setSavingRoutineId] = useState(null);

  // Today's logs
  const [logs, setLogs] = useState([]);
  const nameRef = useRef(null);

  // Daily notes (体調メモ)
  const [dailyNotes, setDailyNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const debounceRef = useRef(null);

  // 体重記録（朝/夜）
  const [weightTab, setWeightTab] = useState("morning");
  const [morningWeight, setMorningWeight] = useState("");
  const [morningBodyFat, setMorningBodyFat] = useState("");
  const [nightWeight, setNightWeight] = useState("");
  const [nightBodyFat, setNightBodyFat] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);

  // 食事セクション
  const [activeMealIndex, setActiveMealIndex] = useState(null); // null = 全て
  const [mealCount, setMealCount] = useState(3);

  // トレーニング記録
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  const [trainingIntensity, setTrainingIntensity] = useState(3);
  const [trainingDuration, setTrainingDuration] = useState("");
  const [trainingNotes, setTrainingNotes] = useState("");
  const [trainingSaving, setTrainingSaving] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user); // null = ゲスト
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [supabase]);

  // Load routines
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadRoutineMeals(supabase, user.id).then(setRoutines);
    } else {
      setRoutines(loadLocalRoutineMeals());
    }
  }, [supabase, user, loading]);

  // Load profile goals + mealCount
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadProfile(supabase, user.id).then((p) => {
        if (p) {
          setGoals({
            budget: p.budget || null,
            protein: p.protein_goal || null,
            fat: p.fat_goal || null,
            carbs: p.carbs_goal || null,
          });
          setMealCount(p.meal_count ?? 3);
        }
      });
    } else {
      const p = loadLocalProfile();
      if (p) {
        setGoals({
          budget: p.budget || null,
          protein: p.protein_goal || null,
          fat: p.fat_goal || null,
          carbs: p.carbs_goal || null,
        });
        setMealCount(p.meal_count ?? 3);
      }
    }
  }, [supabase, user, loading]);

  // Load logs when date or user changes
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadMealLogs(supabase, user.id, date).then(setLogs);
    } else {
      setLogs(loadLocalMealLogs(date));
    }
  }, [supabase, user, date, loading]);

  // Load daily notes when date changes
  useEffect(() => {
    if (loading) return;
    setDailyNotes("");
    setNotesSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (user) {
      loadBodyMetricByDate(supabase, user.id, date).then((m) => {
        setDailyNotes(m?.notes || "");
      });
    } else {
      const m = loadLocalBodyMetricByDate(date);
      setDailyNotes(m?.notes || "");
    }
  }, [supabase, user, date, loading]);

  // Load weight data when date changes
  useEffect(() => {
    if (loading) return;
    setMorningWeight(""); setMorningBodyFat("");
    setNightWeight(""); setNightBodyFat("");
    setWeightSaved(false);

    const loadMetric = async () => {
      let m;
      if (user) {
        m = await loadBodyMetricByDate(supabase, user.id, date);
      } else {
        m = loadLocalBodyMetricByDate(date);
      }
      if (m) {
        setMorningWeight(m.weight != null ? String(m.weight) : "");
        setMorningBodyFat(m.body_fat != null ? String(m.body_fat) : "");
        setNightWeight(m.weight_night != null ? String(m.weight_night) : "");
        setNightBodyFat(m.body_fat_night != null ? String(m.body_fat_night) : "");
      }
    };
    loadMetric();
  }, [supabase, user, date, loading]);

  // Load training logs when date changes
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadTrainingLogsByDate(supabase, user.id, date).then(setTrainingLogs);
    } else {
      setTrainingLogs(loadLocalTrainingLogsByDate(date));
    }
  }, [supabase, user, date, loading]);

  // mealCount 変更時に activeMealIndex が範囲外なら全表示にリセット
  useEffect(() => {
    if (activeMealIndex !== null && activeMealIndex > mealCount) {
      setActiveMealIndex(null);
    }
  }, [mealCount, activeMealIndex]);

  const handleWeightSave = async () => {
    setWeightSaving(true);
    try {
      // 既存の metric を読み込み（notes を保持するため）
      let existing;
      if (user) {
        existing = await loadBodyMetricByDate(supabase, user.id, date);
      } else {
        existing = loadLocalBodyMetricByDate(date);
      }

      const payload = {
        date,
        weight: morningWeight !== "" ? Number(morningWeight) : null,
        bodyFat: morningBodyFat !== "" ? Number(morningBodyFat) : null,
        weightNight: nightWeight !== "" ? Number(nightWeight) : null,
        bodyFatNight: nightBodyFat !== "" ? Number(nightBodyFat) : null,
        notes: existing?.notes || dailyNotes || null,
      };

      if (user) {
        await saveBodyMetric(supabase, user.id, payload);
      } else {
        saveLocalBodyMetric(payload);
      }
      setWeightSaved(true);
      showToast("success", "体重を保存しました");
      setTimeout(() => setWeightSaved(false), 2000);
    } catch {
      showToast("error", "体重の保存に失敗しました");
    } finally {
      setWeightSaving(false);
    }
  };

  const handleTrainingSave = async () => {
    if (selectedBodyParts.length === 0) return;
    setTrainingSaving(true);
    const logData = {
      date,
      bodyParts: selectedBodyParts,
      intensity: trainingIntensity,
      durationMinutes: trainingDuration !== "" ? Number(trainingDuration) : null,
      notes: trainingNotes.trim() || null,
    };

    let saved;
    if (user) {
      saved = await saveTrainingLog(supabase, user.id, logData);
    } else {
      saved = saveLocalTrainingLog(logData);
    }
    setTrainingSaving(false);

    if (saved) {
      showToast("success", "トレーニングを記録しました");
      setTrainingLogs((prev) => [...prev, saved]);
      setSelectedBodyParts([]);
      setTrainingIntensity(3);
      setTrainingDuration("");
      setTrainingNotes("");
      setTrainingOpen(false);
    } else {
      showToast("error", "トレーニング記録の保存に失敗しました");
    }
  };

  const handleTrainingDelete = async (logId) => {
    if (user) {
      await deleteTrainingLog(supabase, user.id, logId);
    } else {
      deleteLocalTrainingLog(logId);
    }
    setTrainingLogs((prev) => prev.filter((t) => t.id !== logId));
  };

  const toggleBodyPart = (partId) => {
    setSelectedBodyParts((prev) =>
      prev.includes(partId) ? prev.filter((p) => p !== partId) : [...prev, partId]
    );
  };

  const handleNotesChange = (value) => {
    setDailyNotes(value);
    setNotesSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setNotesSaving(true);
      if (user) {
        await saveDailyNotes(supabase, user.id, date, value);
      } else {
        saveLocalDailyNotes(date, value);
      }
      setNotesSaving(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }, 1000);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mealName.trim()) return;

    setSaving(true);
    const logData = {
      date,
      mealName: mealName.trim(),
      price: price !== "" ? Number(price) : null,
      protein: protein !== "" ? Number(protein) : null,
      fat: fat !== "" ? Number(fat) : null,
      carbs: carbs !== "" ? Number(carbs) : null,
      mealIndex: activeMealIndex,
    };

    let saved;
    if (user) {
      saved = await saveMealLog(supabase, user.id, logData);
    } else {
      saved = saveLocalMealLog(logData);
    }
    setSaving(false);

    if (saved) {
      showToast("success", "記録完了");
      setLogs((prev) => [...prev, saved]);
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
    if (user) {
      await deleteMealLog(supabase, user.id, logId);
    } else {
      deleteLocalMealLog(logId);
    }
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const handleQuickLog = async (routine) => {
    if (savingRoutineId) return;
    setSavingRoutineId(routine.id);
    const logData = {
      date,
      mealName: routine.meal_name,
      price: routine.price != null ? Number(routine.price) : null,
      protein: routine.protein != null ? Number(routine.protein) : null,
      fat: routine.fat != null ? Number(routine.fat) : null,
      carbs: routine.carbs != null ? Number(routine.carbs) : null,
      mealIndex: activeMealIndex,
    };

    let saved;
    if (user) {
      saved = await saveMealLog(supabase, user.id, logData);
    } else {
      saved = saveLocalMealLog(logData);
    }
    setSavingRoutineId(null);
    if (saved) {
      showToast("success", `${routine.meal_name} 記録完了`);
      setLogs((prev) => [...prev, saved]);
    } else {
      showToast("error", "記録に失敗しました");
    }
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

  // Dashboard: show when goals exist AND viewing today
  const hasGoals = goals && (goals.budget || goals.protein || goals.fat || goals.carbs);
  const isToday = date === today();
  const showDashboard = hasGoals && isToday;
  const calGoal = (goals?.protein && goals?.fat && goals?.carbs)
    ? Math.round(goals.protein * 4 + goals.fat * 9 + goals.carbs * 4)
    : null;

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

        {/* Daily notes (体調メモ) */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <PenLine size={12} strokeWidth={1.5} />体調メモ
            </span>
            {notesSaving && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>保存中...</span>}
            {notesSaved && !notesSaving && <span style={{ fontSize: 10, color: "#4ade80" }}>保存完了</span>}
          </div>
          <textarea
            value={dailyNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="昨日は飲み会だった / 脚の筋肉痛がひどい / 睡眠不足..."
            rows={2}
            style={S.notesInput}
          />
        </div>

        {/* 体重記録カード */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Scale size={12} strokeWidth={1.5} />体重記録
            </span>
            <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {["morning", "night"].map((tab) => (
                <button key={tab} onClick={() => setWeightTab(tab)} style={{
                  padding: "5px 14px", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: weightTab === tab
                    ? (tab === "morning" ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)")
                    : "transparent",
                  color: weightTab === tab
                    ? (tab === "morning" ? "#4ade80" : "#f59e0b")
                    : "rgba(255,255,255,0.35)",
                  transition: "all 0.2s",
                }}>
                  {tab === "morning" ? "☀ 朝" : "🌙 夜"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>体重</label>
              <div style={S.numWrap}>
                <input
                  type="number" inputMode="decimal" step="0.1" min="30" max="200"
                  value={weightTab === "morning" ? morningWeight : nightWeight}
                  onChange={(e) => weightTab === "morning" ? setMorningWeight(e.target.value) : setNightWeight(e.target.value)}
                  placeholder="—"
                  style={{ ...S.numInput, color: weightTab === "morning" ? "#4ade80" : "#f59e0b" }}
                />
                <span style={S.unit}>kg</span>
              </div>
            </div>
            <div style={S.fieldWrap}>
              <label style={S.fieldLabel}>体脂肪率</label>
              <div style={S.numWrap}>
                <input
                  type="number" inputMode="decimal" step="0.1" min="1" max="60"
                  value={weightTab === "morning" ? morningBodyFat : nightBodyFat}
                  onChange={(e) => weightTab === "morning" ? setMorningBodyFat(e.target.value) : setNightBodyFat(e.target.value)}
                  placeholder="—"
                  style={{ ...S.numInput, color: weightTab === "morning" ? "#4ade80" : "#f59e0b" }}
                />
                <span style={S.unit}>%</span>
              </div>
            </div>
          </div>

          {/* 朝夜サマリー */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 10, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
            {morningWeight && <span>☀ 朝 <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{morningWeight}</span>kg</span>}
            {nightWeight && <span>🌙 夜 <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "'Space Mono',monospace" }}>{nightWeight}</span>kg</span>}
            {morningWeight && nightWeight && (
              <span style={{ color: "rgba(255,255,255,0.25)" }}>
                差 <span style={{ fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "rgba(255,255,255,0.5)" }}>
                  {(Number(nightWeight) - Number(morningWeight) >= 0 ? "+" : "")}{(Number(nightWeight) - Number(morningWeight)).toFixed(1)}
                </span>kg
              </span>
            )}
          </div>

          <button onClick={handleWeightSave} disabled={weightSaving} style={{
            width: "100%", padding: "10px 0", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
            background: weightSaving ? "#555" : weightSaved ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
            color: weightSaved ? "#4ade80" : "rgba(255,255,255,0.6)",
            cursor: weightSaving ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}>
            {weightSaving ? "保存中..." : weightSaved ? "✓ 保存しました" : "体重を保存"}
          </button>
        </div>

        {/* トレーニング記録 */}
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: trainingOpen ? 14 : 0 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Dumbbell size={12} strokeWidth={1.5} />トレーニング記録
            </span>
            <button onClick={() => setTrainingOpen(!trainingOpen)} style={{
              padding: "5px 12px", border: "1px solid rgba(168,139,250,0.3)", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: trainingOpen ? "rgba(168,139,250,0.15)" : "transparent",
              color: trainingOpen ? "#a78bfa" : "rgba(255,255,255,0.35)", cursor: "pointer", transition: "all 0.2s",
            }}>
              {trainingOpen ? "閉じる" : "＋ 記録する"}
            </button>
          </div>

          {trainingOpen && (
            <>
              {/* 部位選択チップ */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "block", marginBottom: 6 }}>部位（複数選択可）</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {BODY_PART_OPTIONS.map((part) => {
                    const selected = selectedBodyParts.includes(part.id);
                    return (
                      <button key={part.id} onClick={() => toggleBodyPart(part.id)} style={{
                        padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${selected ? part.color : "rgba(255,255,255,0.1)"}`,
                        background: selected ? `${part.color}20` : "rgba(255,255,255,0.03)",
                        color: selected ? part.color : "rgba(255,255,255,0.4)",
                        transition: "all 0.15s",
                      }}>
                        {part.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 強度 ★ */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  強度
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button key={level} onClick={() => setTrainingIntensity(level)} style={{
                      background: "transparent", border: "none", cursor: "pointer", padding: 2, transition: "transform 0.15s",
                      transform: trainingIntensity >= level ? "scale(1.1)" : "scale(1)",
                    }}>
                      <Star
                        size={24}
                        fill={trainingIntensity >= level ? "#fbbf24" : "transparent"}
                        color={trainingIntensity >= level ? "#fbbf24" : "rgba(255,255,255,0.15)"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 8, fontFamily: "'Space Mono',monospace", fontWeight: 700 }}>
                    {trainingIntensity}/5
                  </span>
                </div>
              </div>

              {/* 時間 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <Clock size={11} strokeWidth={1.5} />時間
                </label>
                <div style={S.numWrap}>
                  <input
                    type="number" inputMode="numeric" min="0" max="600"
                    value={trainingDuration} onChange={(e) => setTrainingDuration(e.target.value)}
                    placeholder="60" style={{ ...S.numInput, color: "#a78bfa" }}
                  />
                  <span style={S.unit}>分</span>
                </div>
              </div>

              {/* 種目メモ */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  種目メモ（任意）
                </label>
                <textarea
                  value={trainingNotes} onChange={(e) => setTrainingNotes(e.target.value)}
                  placeholder={"ベンチ 80kg×8×3\nインクラインDB 26kg×10×3\nケーブルフライ 15kg×12×3"}
                  rows={3}
                  style={S.notesInput}
                />
              </div>

              <button onClick={handleTrainingSave} disabled={trainingSaving || selectedBodyParts.length === 0} style={{
                width: "100%", padding: "10px 0", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
                background: trainingSaving ? "#555" : selectedBodyParts.length === 0 ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                color: selectedBodyParts.length === 0 ? "rgba(255,255,255,0.2)" : "#fff",
                cursor: trainingSaving || selectedBodyParts.length === 0 ? "not-allowed" : "pointer",
                boxShadow: selectedBodyParts.length > 0 ? "0 4px 20px rgba(139,92,246,0.3)" : "none",
                transition: "all 0.2s",
              }}>
                {trainingSaving ? "記録中..." : "トレーニングを記録"}
              </button>
            </>
          )}

          {/* 当日のトレーニングログ一覧 */}
          {trainingLogs.length > 0 && (
            <div style={{ marginTop: trainingOpen ? 14 : 12 }}>
              {trainingLogs.map((tl) => (
                <div key={tl.id} style={{
                  padding: "10px 12px", background: "rgba(168,139,250,0.04)", border: "1px solid rgba(168,139,250,0.1)",
                  borderRadius: 12, marginBottom: 6,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(tl.body_parts || []).map((partId) => {
                        const part = BODY_PART_OPTIONS.find((p) => p.id === partId);
                        return (
                          <span key={partId} style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                            background: `${part?.color || "#a78bfa"}20`, color: part?.color || "#a78bfa",
                          }}>
                            {part?.label || partId}
                          </span>
                        );
                      })}
                    </div>
                    <button onClick={() => handleTrainingDelete(tl.id)} style={S.deleteBtn} aria-label="削除">
                      <Trash2 size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={10} fill={i <= (tl.intensity || 0) ? "#fbbf24" : "transparent"} color={i <= (tl.intensity || 0) ? "#fbbf24" : "rgba(255,255,255,0.15)"} strokeWidth={1.5} />
                      ))}
                    </span>
                    {tl.duration_minutes != null && (
                      <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 600 }}>{tl.duration_minutes}分</span>
                    )}
                  </div>
                  {tl.notes && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {tl.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dashboard */}
        {showDashboard && (
          <div style={S.dashboard}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12, fontWeight: 600 }}>
              <BarChart3 size={14} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />今日の進捗
            </div>

            {/* Budget bar */}
            {goals.budget && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}><Wallet size={12} strokeWidth={1.5} />食費</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    ¥{totals.price.toLocaleString()} / ¥{goals.budget.toLocaleString()}
                  </span>
                </div>
                <div style={S.budgetBar}>
                  <div style={{
                    ...S.budgetFill,
                    width: `${Math.min((totals.price / goals.budget) * 100, 100)}%`,
                    background: totals.price > goals.budget
                      ? "#ef4444"
                      : totals.price / goals.budget >= 0.8
                        ? "#facc15"
                        : "#22c55e",
                  }} />
                </div>
                <div style={{ fontSize: 11, marginTop: 4, textAlign: "right", color: totals.price > goals.budget ? "#ef4444" : "rgba(255,255,255,0.35)" }}>
                  {totals.price > goals.budget
                    ? `¥${(totals.price - goals.budget).toLocaleString()} オーバー`
                    : `残り ¥${(goals.budget - totals.price).toLocaleString()}`}
                </div>
              </div>
            )}

            {/* PFC + Cal rings */}
            <div style={S.ringGrid}>
              <ProgressRing label="P" value={totals.protein} max={goals.protein} color="#f87171" unit="g" />
              <ProgressRing label="F" value={totals.fat} max={goals.fat} color="#facc15" unit="g" />
              <ProgressRing label="C" value={totals.carbs} max={goals.carbs} color="#60a5fa" unit="g" />
              {calGoal && <ProgressRing label="Cal" value={totalCal} max={calGoal} color="#4ade80" unit="kcal" />}
            </div>
          </div>
        )}

        {/* 食事セクション切替 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <button
              onClick={() => setActiveMealIndex(null)}
              style={{
                flex: 1, padding: "8px 0", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: activeMealIndex === null ? "rgba(34,197,94,0.12)" : "transparent",
                color: activeMealIndex === null ? "#4ade80" : "rgba(255,255,255,0.35)",
                transition: "all 0.2s",
              }}
            >
              全て
            </button>
            {Array.from({ length: mealCount }, (_, i) => i + 1).map((idx) => (
              <button
                key={idx}
                onClick={() => setActiveMealIndex(idx)}
                style={{
                  flex: 1, padding: "8px 0", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                  background: activeMealIndex === idx ? "rgba(34,197,94,0.12)" : "transparent",
                  color: activeMealIndex === idx ? "#4ade80" : "rgba(255,255,255,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {idx}食目
              </button>
            ))}
          </div>
        </div>

        {/* Routine meals - one-tap section */}
        {routines.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Zap size={12} strokeWidth={1.5} />マイルーティン</span>
              <a href="/routines" style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>管理 →</a>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {routines.map((r) => {
                const isSaving = savingRoutineId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleQuickLog(r)}
                    disabled={!!savingRoutineId}
                    style={{
                      ...S.routineChip,
                      opacity: isSaving ? 0.5 : savingRoutineId ? 0.7 : 1,
                      cursor: savingRoutineId ? "not-allowed" : "pointer",
                    }}
                  >
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: (r.emoji && r.emoji.startsWith("#")) ? r.emoji : "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UtensilsCrossed size={14} strokeWidth={1.5} color="white" />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 80 }}>
                      {isSaving ? "記録中..." : r.meal_name}
                    </span>
                    <div style={{ display: "flex", gap: 4, flexWrap: "nowrap" }}>
                      {r.price != null && <span style={S.chipBadge}>¥{Number(r.price).toLocaleString()}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 3 }}>
                      {r.protein != null && <span style={{ ...S.chipPfc, color: "#f87171" }}>P{Number(r.protein).toFixed(0)}</span>}
                      {r.fat != null && <span style={{ ...S.chipPfc, color: "#facc15" }}>F{Number(r.fat).toFixed(0)}</span>}
                      {r.carbs != null && <span style={{ ...S.chipPfc, color: "#60a5fa" }}>C{Number(r.carbs).toFixed(0)}</span>}
                    </div>
                  </button>
                );
              })}
              {/* Add more button */}
              <a href="/routines" style={S.routineAdd}>
                <Plus size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>追加</span>
              </a>
            </div>
          </div>
        )}

        {routines.length === 0 && (
          <a href="/routines" style={{ display: "block", textDecoration: "none", ...S.card, textAlign: "center", padding: "14px 18px", marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              ルーティンを登録すると素早く記録できます
            </span>
          </a>
        )}

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
              <label style={S.fieldLabel}>金額</label>
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

        {/* Today's summary (hidden when dashboard is shown) */}
        {logs.length > 0 && !showDashboard && (
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
        {(() => {
          const filteredLogs = activeMealIndex === null
            ? logs
            : logs.filter((l) => l.meal_index === activeMealIndex);

          return filteredLogs.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              {filteredLogs.map((log) => (
                <div key={log.id} style={S.logItem}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                      {log.meal_index != null && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6,
                          background: "rgba(34,197,94,0.1)", color: "#4ade80", flexShrink: 0,
                        }}>
                          {log.meal_index}食目
                        </span>
                      )}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.meal_name}</span>
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
          ) : (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 32 }}>
              {activeMealIndex !== null ? `${activeMealIndex}食目の記録はまだありません` : "まだ記録がありません"}
            </p>
          );
        })()}
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

  dashboard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "16px 18px", marginBottom: 14 },
  budgetBar: { width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 4, transition: "width 0.5s ease, background 0.3s ease" },
  ringGrid: { display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 8 },

  summaryCard: { background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 16, padding: "14px 16px", marginTop: 14 },
  summaryGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  summaryItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)" },

  logItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, marginBottom: 6 },
  deleteBtn: { width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  routineChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, minWidth: 90, flexShrink: 0, transition: "all 0.15s" },
  chipBadge: { fontSize: 10, fontWeight: 600, color: "#4ade80", fontFamily: "'Space Mono',monospace" },
  chipPfc: { fontSize: 9, fontWeight: 600, fontFamily: "'Space Mono',monospace" },
  routineAdd: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, minWidth: 70, flexShrink: 0, textDecoration: "none", color: "rgba(255,255,255,0.3)" },

  notesInput: { width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif", resize: "vertical", lineHeight: 1.6 },
};

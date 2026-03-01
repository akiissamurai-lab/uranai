"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { saveMealLog, loadMealLogs, deleteMealLog, loadProfile, loadRoutineMeals, saveDailyNotes, loadBodyMetricByDate, saveBodyMetric, saveTrainingLog, loadTrainingLogsByDate, deleteTrainingLog, isDbError } from "@/lib/db";
import { saveLocalMealLog, loadLocalMealLogs, deleteLocalMealLog, loadLocalRoutineMeals, loadLocalProfile, saveLocalDailyNotes, loadLocalBodyMetricByDate, saveLocalBodyMetric, saveLocalTrainingLog, loadLocalTrainingLogsByDate, deleteLocalTrainingLog } from "@/lib/local-db";
import { Wallet, Zap, UtensilsCrossed, Plus, PenLine, Scale, Dumbbell, Star, Trash2, ChevronDown, X, Sparkles } from "lucide-react";
import { searchFoods, calcForServing } from "@/lib/food-db";

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

/* ── Compact PFC + Budget bar ── */
function MiniDashboard({ totals, totalCal, goals, calGoal }) {
  const items = [];
  if (goals.budget) {
    const pct = Math.min((totals.price / goals.budget) * 100, 100);
    const over = totals.price > goals.budget;
    items.push({ label: "食費", current: `¥${totals.price.toLocaleString()}`, max: goals.budget, pct, over, color: over ? "#ef4444" : "#22c55e" });
  }
  if (goals.protein) {
    const pct = Math.min((totals.protein / goals.protein) * 100, 100);
    items.push({ label: "P", current: `${Math.round(totals.protein)}g`, max: goals.protein, pct, over: totals.protein > goals.protein, color: "#f87171" });
  }
  if (goals.fat) {
    const pct = Math.min((totals.fat / goals.fat) * 100, 100);
    items.push({ label: "F", current: `${Math.round(totals.fat)}g`, max: goals.fat, pct, over: totals.fat > goals.fat, color: "#facc15" });
  }
  if (goals.carbs) {
    const pct = Math.min((totals.carbs / goals.carbs) * 100, 100);
    items.push({ label: "C", current: `${Math.round(totals.carbs)}g`, max: goals.carbs, pct, over: totals.carbs > goals.carbs, color: "#60a5fa" });
  }

  if (items.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
      {items.map((it) => (
        <div key={it.label} style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 4, fontWeight: 400 }}>{it.label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: it.over ? "#ef4444" : it.color, fontFamily: "var(--font-mono)", marginBottom: 4 }}>
            {it.current}
          </div>
          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${it.pct}%`, background: it.over ? "#ef4444" : it.color, transition: "width 0.4s ease" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── [4-2] sessionStorage ドラフト保存キー ── */
const DRAFT_KEY = "datsudebu_meal_draft";

/* ── Bottom Sheet for Manual Input ── */
function ManualInputSheet({ open, onClose, onSubmit, saving, activeMealIndex }) {
  const [mealName, setMealName] = useState("");
  const [price, setPrice] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const nameRef = useRef(null);
  const draftTimerRef = useRef(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servingSize, setServingSize] = useState("");
  const [aiEstimating, setAiEstimating] = useState(false);
  const [aiSource, setAiSource] = useState(false);

  // [4-2] シートを開いた時: ドラフトがあれば復元
  useEffect(() => {
    if (open) {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.mealName || d.price || d.protein || d.fat || d.carbs) {
            setMealName(d.mealName || ""); setPrice(d.price || "");
            setProtein(d.protein || ""); setFat(d.fat || ""); setCarbs(d.carbs || "");
            setDraftRestored(true);
            setTimeout(() => setDraftRestored(false), 3000);
            setTimeout(() => nameRef.current?.focus(), 100);
            return; // ドラフト復元時はクリアしない
          }
        }
      } catch {}
      // ドラフトなし → 通常の初期化
      setMealName(""); setPrice(""); setProtein(""); setFat(""); setCarbs("");
      setSuggestions([]); setShowSuggestions(false); setSelectedFood(null); setServingSize(""); setAiSource(false);
      setDraftRestored(false);
      setTimeout(() => nameRef.current?.focus(), 100);
    }
  }, [open]);

  // [4-2] 入力変更時にsessionStorageへデバウンス保存（2秒）
  useEffect(() => {
    if (!open) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        if (mealName || price || protein || fat || carbs) {
          sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ mealName, price, protein, fat, carbs }));
        }
      } catch {}
    }, 2000);
    return () => { if (draftTimerRef.current) clearTimeout(draftTimerRef.current); };
  }, [open, mealName, price, protein, fat, carbs]);

  // Search foods on name change
  const handleNameChange = (val) => {
    setMealName(val);
    setAiSource(false);
    if (val.length >= 1) {
      const results = searchFoods(val);
      setSuggestions(results);
      setShowSuggestions(val.length >= 1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    // Clear selection if user edits
    if (selectedFood) { setSelectedFood(null); setServingSize(""); }
  };

  // Select a food from suggestions
  const handleSelectFood = (food) => {
    setMealName(food.name);
    setSelectedFood(food);
    setServingSize(String(food.serving));
    setShowSuggestions(false);
    // Auto-fill PFC
    setProtein(String(food.p));
    setFat(String(food.f));
    setCarbs(String(food.c));
    setPrice(String(food.price));
  };

  // Recalculate PFC when serving size changes
  const handleServingChange = (val) => {
    setServingSize(val);
    if (!selectedFood || val === "") return;
    const g = Number(val);
    if (isNaN(g) || g <= 0) return;
    const calc = calcForServing(selectedFood, g);
    setProtein(String(calc.protein));
    setFat(String(calc.fat));
    setCarbs(String(calc.carbs));
    setPrice(String(calc.price));
  };

  // AI estimation fallback
  const handleAiEstimate = async () => {
    if (!mealName.trim() || aiEstimating) return;
    setAiEstimating(true);
    try {
      // [1-1] AI推定にクライアント側タイムアウト追加
      const res = await fetch("/api/macro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          foodQuery: mealName.trim(),
          prompt: `以下の食品・料理の1食分の標準的な栄養素を推定してください。JSON形式のみで回答してください。他のテキストは一切不要です。

食品名: ${mealName.trim()}

回答形式（厳守）:
{"p":数値,"f":数値,"c":数値,"cal":数値,"price":数値,"serving":"量の説明"}

p=たんぱく質(g), f=脂質(g), c=炭水化物(g), cal=カロリー(kcal), price=目安価格(円), serving=1食分の量の説明（例: "1膳150g", "1個60g"）`
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.content;
        const text = (Array.isArray(raw) ? raw[0]?.text : typeof raw === "string" ? raw : "").trim();
        // Extract JSON from response
        const jsonMatch = text.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.p != null) setProtein(String(Math.round(parsed.p)));
          if (parsed.f != null) setFat(String(Math.round(parsed.f)));
          if (parsed.c != null) setCarbs(String(Math.round(parsed.c)));
          if (parsed.price != null) setPrice(String(Math.round(parsed.price)));
          setAiSource(true);
        }
      }
    } catch (e) {
      console.warn("AI estimation failed:", e);
    } finally {
      setAiEstimating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    onSubmit({
      mealName: mealName.trim(),
      price: price !== "" ? Number(price) : null,
      protein: protein !== "" ? Number(protein) : null,
      fat: fat !== "" ? Number(fat) : null,
      carbs: carbs !== "" ? Number(carbs) : null,
      mealIndex: activeMealIndex,
    });
    setMealName(""); setPrice(""); setProtein(""); setFat(""); setCarbs("");
    setSelectedFood(null); setServingSize(""); setAiSource(false);
    // [4-2] 送信成功時にドラフトクリア
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  };

  const hasSuggestionForName = suggestions.length > 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: open ? 999 : -1, opacity: open ? 1 : 0,
        transition: "opacity 0.25s ease",
        pointerEvents: open ? "auto" : "none",
      }} />

      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(170deg, #141820, #0d1117)",
        borderRadius: "24px 24px 0 0",
        padding: "16px 20px 32px",
        zIndex: 1000,
        transform: open ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
        maxWidth: 480, margin: "0 auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: draftRestored ? 8 : 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>手動で追加</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {/* [4-2] ドラフト復元通知 */}
        {draftRestored && (
          <div style={{
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: 8, padding: "6px 10px", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 11, color: "#4ade80" }}>✨ 前回の入力を復元しました</span>
            <button type="button" onClick={() => {
              setMealName(""); setPrice(""); setProtein(""); setFat(""); setCarbs("");
              setDraftRestored(false);
              try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
            }} style={{
              marginLeft: "auto", background: "transparent", border: "none",
              color: "rgba(255,255,255,0.4)", fontSize: 10, cursor: "pointer",
            }}>クリア</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Meal name with autocomplete */}
          <div style={{ position: "relative", marginBottom: showSuggestions ? 0 : 16 }}>
            <input
              ref={nameRef}
              type="text"
              value={mealName}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => { if (mealName.length >= 1) setShowSuggestions(true); }}
              placeholder="例:「鶏むね肉」→ PFC・価格を自動計算 ✨"
              required
              autoComplete="off"
              style={S.sheetTextInput}
            />

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div style={{
                background: "rgba(20,24,35,0.98)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0 0 14px 14px", borderTop: "none",
                maxHeight: 200, overflowY: "auto", marginTop: -2,
                zIndex: 50,
              }}>
                {suggestions.length > 0 ? suggestions.map((food, i) => (
                  <button key={i} type="button" onClick={() => handleSelectFood(food)} style={{
                    width: "100%", padding: "10px 14px", border: "none", background: "transparent",
                    cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{food.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                        {food.serving}{food.unit}あたり
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, fontSize: 10, fontFamily: "var(--font-mono)" }}>
                      <span style={{ color: "#f87171" }}>P{food.p}</span>
                      <span style={{ color: "#facc15" }}>F{food.f}</span>
                      <span style={{ color: "#60a5fa" }}>C{food.c}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>¥{food.price}</span>
                    </div>
                  </button>
                )) : mealName.trim().length >= 2 && (
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                      該当する食品が見つかりません
                    </div>
                    <button type="button" onClick={handleAiEstimate} disabled={aiEstimating} style={{
                      width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid rgba(168,139,250,0.25)",
                      background: "rgba(168,139,250,0.08)", color: "#a78bfa", fontSize: 13, fontWeight: 600,
                      cursor: aiEstimating ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      opacity: aiEstimating ? 0.6 : 1, transition: "all 0.2s",
                    }}>
                      <Sparkles size={14} strokeWidth={1.5} />
                      {aiEstimating ? "推定中..." : `「${mealName.trim()}」のPFCをAIで推定`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {showSuggestions && <div style={{ height: 16 }} />}

          {/* Serving size adjuster (when food is selected) */}
          {selectedFood && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.12)",
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>量</span>
              <input
                type="number" inputMode="decimal" value={servingSize}
                onChange={(e) => handleServingChange(e.target.value)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#4ade80", fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", textAlign: "center", minWidth: 0 }}
              />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{selectedFood.unit}</span>
              {/* Quick serving buttons */}
              <div style={{ display: "flex", gap: 4 }}>
                {[0.5, 1, 1.5, 2].map(mult => {
                  const val = Math.round(selectedFood.serving * mult);
                  const isActive = servingSize === String(val);
                  return (
                    <button key={mult} type="button" onClick={() => handleServingChange(String(val))} style={{
                      padding: "4px 8px", borderRadius: 8, border: `1px solid ${isActive ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)"}`,
                      background: isActive ? "rgba(74,222,128,0.15)" : "transparent",
                      color: isActive ? "#4ade80" : "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 600, cursor: "pointer",
                    }}>{mult === 1 ? "1食" : `×${mult}`}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI estimation — now inside dropdown; keep aiSource label below */}

          {/* AI source label */}
          {aiSource && (
            <div style={{ fontSize: 10, color: "rgba(168,139,250,0.5)", textAlign: "center", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Sparkles size={10} strokeWidth={1.5} /> AI推定値（目安）
            </div>
          )}

          {/* PFC + Price in one row with quick buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={S.sheetFieldWrap}>
              <label style={{ ...S.sheetFieldLabel, color: "#f87171" }}>P</label>
              <div style={S.sheetNumWrap}>
                <input type="number" inputMode="decimal" step="any" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="—" min="0" style={{ ...S.sheetNumInput, color: "#f87171" }} />
                <span style={S.sheetUnit}>g</span>
              </div>
            </div>
            <div style={S.sheetFieldWrap}>
              <label style={{ ...S.sheetFieldLabel, color: "#facc15" }}>F</label>
              <div style={S.sheetNumWrap}>
                <input type="number" inputMode="decimal" step="any" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="—" min="0" style={{ ...S.sheetNumInput, color: "#facc15" }} />
                <span style={S.sheetUnit}>g</span>
              </div>
            </div>
            <div style={S.sheetFieldWrap}>
              <label style={{ ...S.sheetFieldLabel, color: "#60a5fa" }}>C</label>
              <div style={S.sheetNumWrap}>
                <input type="number" inputMode="decimal" step="any" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="—" min="0" style={{ ...S.sheetNumInput, color: "#60a5fa" }} />
                <span style={S.sheetUnit}>g</span>
              </div>
            </div>
            <div style={S.sheetFieldWrap}>
              <label style={S.sheetFieldLabel}>¥</label>
              <div style={S.sheetNumWrap}>
                <input type="number" inputMode="numeric" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="—" min="0" style={S.sheetNumInput} />
                <span style={S.sheetUnit}>円</span>
              </div>
            </div>
          </div>

          {/* Quick-tap value buttons (hidden when food selected from DB) */}
          {!selectedFood && !aiSource && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[10, 20, 30].map(v => (
                  <button key={v} type="button" onClick={() => setProtein(String(v))}
                    style={{ ...S.quickBtn, color: "#f87171", borderColor: protein === String(v) ? "#f87171" : "rgba(255,255,255,0.08)", background: protein === String(v) ? "rgba(248,113,113,0.15)" : "transparent" }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {[5, 10, 15].map(v => (
                  <button key={v} type="button" onClick={() => setFat(String(v))}
                    style={{ ...S.quickBtn, color: "#facc15", borderColor: fat === String(v) ? "#facc15" : "rgba(255,255,255,0.08)", background: fat === String(v) ? "rgba(250,204,21,0.15)" : "transparent" }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {[20, 40, 60].map(v => (
                  <button key={v} type="button" onClick={() => setCarbs(String(v))}
                    style={{ ...S.quickBtn, color: "#60a5fa", borderColor: carbs === String(v) ? "#60a5fa" : "rgba(255,255,255,0.08)", background: carbs === String(v) ? "rgba(96,165,250,0.15)" : "transparent" }}>
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                {[100, 200, 500].map(v => (
                  <button key={v} type="button" onClick={() => setPrice(String(v))}
                    style={{ ...S.quickBtn, borderColor: price === String(v) ? "#4ade80" : "rgba(255,255,255,0.08)", background: price === String(v) ? "rgba(74,222,128,0.15)" : "transparent" }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(selectedFood || aiSource) && <div style={{ height: 16 }} />}

          <button type="submit" disabled={saving || !mealName.trim()} style={{
            width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
            fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: 0.5,
            background: saving ? "#555" : "linear-gradient(135deg, #22c55e, #16a34a)",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: !mealName.trim() && !saving ? 0.4 : 1,
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
            transition: "all 0.2s",
          }}>
            {saving ? "記録中..." : "記録する"}
          </button>
        </form>
      </div>
    </>
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

  // Date
  const [date, setDate] = useState(today());

  // Goals from profile
  const [goals, setGoals] = useState(null);

  // Routines
  const [routines, setRoutines] = useState([]);
  const [savingRoutineId, setSavingRoutineId] = useState(null);

  // Today's logs
  const [logs, setLogs] = useState([]);

  // Daily notes (体調メモ) — hidden by default
  const [dailyNotes, setDailyNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const debounceRef = useRef(null);

  // 体重記録（朝/夜）— hidden by default
  const [weightOpen, setWeightOpen] = useState(false);
  const [weightTab, setWeightTab] = useState("morning");
  const [morningWeight, setMorningWeight] = useState("");
  const [morningBodyFat, setMorningBodyFat] = useState("");
  const [nightWeight, setNightWeight] = useState("");
  const [nightBodyFat, setNightBodyFat] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);

  // 食事セクション
  const [activeMealIndex, setActiveMealIndex] = useState(null);
  const [mealCount, setMealCount] = useState(3);

  // トレーニング — hidden by default
  const [trainingLogs, setTrainingLogs] = useState([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState([]);
  const [trainingIntensity, setTrainingIntensity] = useState(3);
  const [trainingDuration, setTrainingDuration] = useState("");
  const [trainingNotes, setTrainingNotes] = useState("");
  const [trainingSaving, setTrainingSaving] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(false);

  // Bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // [4-1] beforeunload: 食事入力シートが開いている時に離脱警告
  useEffect(() => {
    const handler = (e) => {
      if (sheetOpen) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sheetOpen]);

  // [3-2] visibilitychange: タブ復帰時にデータ再取得（30秒以上離れていた場合のみ）
  const lastVisibleRef = useRef(Date.now());
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        lastVisibleRef.current = Date.now();
      } else {
        const elapsed = Date.now() - lastVisibleRef.current;
        if (elapsed > 30000 && !loading) {
          // 表示専用データのみ再取得（編集中フォームには触れない）
          if (user) {
            loadMealLogs(supabase, user.id, date).then(r => { if (!r._error) setLogs(r); });
          } else {
            setLogs(loadLocalMealLogs(date));
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [supabase, user, date, loading]);

  // Onboarding hint banner (show once)
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("datsudebu_hint_dismissed");
      if (!dismissed) setShowHint(true);
    }
  }, []);
  const dismissHint = () => {
    setShowHint(false);
    if (typeof window !== "undefined") localStorage.setItem("datsudebu_hint_dismissed", "1");
  };

  useEffect(() => {
    const authTimeout = setTimeout(() => { setLoading(false); }, 5000);
    supabase.auth.getUser().then(({ data: { user } }) => {
      clearTimeout(authTimeout);
      setUser(user);
      setLoading(false);
    }).catch(() => { clearTimeout(authTimeout); setLoading(false); });
    return () => clearTimeout(authTimeout);
  }, [supabase]);

  // Load routines
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadRoutineMeals(supabase, user.id).then(r => { setRoutines(r); if (r._error) showToast("error", "ルーティンの取得に失敗: " + r._error); });
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
          setGoals({ budget: p.budget || null, protein: p.protein_goal || null, fat: p.fat_goal || null, carbs: p.carbs_goal || null });
          setMealCount(p.meal_count ?? 3);
        }
      });
    } else {
      const p = loadLocalProfile();
      if (p) {
        setGoals({ budget: p.budget || null, protein: p.protein_goal || null, fat: p.fat_goal || null, carbs: p.carbs_goal || null });
        setMealCount(p.meal_count ?? 3);
      }
    }
  }, [supabase, user, loading]);

  // Load logs
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadMealLogs(supabase, user.id, date).then(r => { setLogs(r); if (r._error) showToast("error", "食事記録の取得に失敗: " + r._error); });
    } else {
      setLogs(loadLocalMealLogs(date));
    }
  }, [supabase, user, date, loading]);

  // Load daily notes
  useEffect(() => {
    if (loading) return;
    setDailyNotes(""); setNotesSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (user) {
      loadBodyMetricByDate(supabase, user.id, date).then((m) => {
        setDailyNotes(m?.notes || "");
        if (m?.notes) setNotesOpen(true);
      });
    } else {
      const m = loadLocalBodyMetricByDate(date);
      setDailyNotes(m?.notes || "");
      if (m?.notes) setNotesOpen(true);
    }
  }, [supabase, user, date, loading]);

  // Load weight data
  useEffect(() => {
    if (loading) return;
    setMorningWeight(""); setMorningBodyFat("");
    setNightWeight(""); setNightBodyFat("");
    setWeightSaved(false);
    const loadMetric = async () => {
      let m;
      if (user) { m = await loadBodyMetricByDate(supabase, user.id, date); }
      else { m = loadLocalBodyMetricByDate(date); }
      if (m) {
        setMorningWeight(m.weight != null ? String(m.weight) : "");
        setMorningBodyFat(m.body_fat != null ? String(m.body_fat) : "");
        setNightWeight(m.weight_night != null ? String(m.weight_night) : "");
        setNightBodyFat(m.body_fat_night != null ? String(m.body_fat_night) : "");
        if (m.weight != null || m.weight_night != null) setWeightOpen(true);
      }
    };
    loadMetric();
  }, [supabase, user, date, loading]);

  // Load training logs
  useEffect(() => {
    if (loading) return;
    if (user) {
      loadTrainingLogsByDate(supabase, user.id, date).then((tl) => {
        setTrainingLogs(tl);
        if (tl._error) showToast("error", "筋トレ記録の取得に失敗: " + tl._error);
        else if (tl.length > 0) setTrainingOpen(true);
      });
    } else {
      const tl = loadLocalTrainingLogsByDate(date);
      setTrainingLogs(tl);
      if (tl.length > 0) setTrainingOpen(true);
    }
  }, [supabase, user, date, loading]);

  // mealCount safety
  useEffect(() => {
    if (activeMealIndex !== null && activeMealIndex > mealCount) setActiveMealIndex(null);
  }, [mealCount, activeMealIndex]);

  /* ── Handlers ── */
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2500);
  };

  const handleWeightSave = async () => {
    setWeightSaving(true);
    // [1-2] UIタイムアウトガード: 20秒で強制解除
    const uiTimeout = setTimeout(() => { setWeightSaving(false); showToast("error", "タイムアウト: 接続を確認してください"); }, 20000);
    try {
      let existing;
      if (user) { existing = await loadBodyMetricByDate(supabase, user.id, date); }
      else { existing = loadLocalBodyMetricByDate(date); }
      const payload = {
        date,
        weight: morningWeight !== "" ? Number(morningWeight) : null,
        bodyFat: morningBodyFat !== "" ? Number(morningBodyFat) : null,
        weightNight: nightWeight !== "" ? Number(nightWeight) : null,
        bodyFatNight: nightBodyFat !== "" ? Number(nightBodyFat) : null,
        notes: existing?.notes || dailyNotes || null,
      };
      let ok;
      if (user) { ok = await saveBodyMetric(supabase, user.id, payload); }
      else { ok = saveLocalBodyMetric(payload); }
      if (isDbError(ok)) { showToast("error", "体重の保存に失敗: " + ok._error); return; }
      setWeightSaved(true);
      showToast("success", "体重を保存しました");
      setTimeout(() => setWeightSaved(false), 2000);
    } catch {
      showToast("error", "保存に失敗しました");
    } finally { clearTimeout(uiTimeout); setWeightSaving(false); }
  };

  const handleTrainingSave = async () => {
    if (selectedBodyParts.length === 0) return;
    setTrainingSaving(true);
    // [1-2] UIタイムアウトガード
    const uiTimeout = setTimeout(() => { setTrainingSaving(false); showToast("error", "タイムアウト: 接続を確認してください"); }, 20000);
    const logData = {
      date, bodyParts: selectedBodyParts, intensity: trainingIntensity,
      durationMinutes: trainingDuration !== "" ? Number(trainingDuration) : null,
      notes: trainingNotes.trim() || null,
    };
    let saved;
    if (user) { saved = await saveTrainingLog(supabase, user.id, logData); }
    else { saved = saveLocalTrainingLog(logData); }
    clearTimeout(uiTimeout);
    setTrainingSaving(false);
    if (isDbError(saved)) {
      showToast("error", "筋トレの保存に失敗: " + saved._error);
    } else if (saved) {
      showToast("success", "トレーニングを記録しました");
      setTrainingLogs((prev) => [...prev, saved]);
      setSelectedBodyParts([]); setTrainingIntensity(3); setTrainingDuration(""); setTrainingNotes("");
    } else { showToast("error", "保存に失敗しました"); }
  };

  const handleTrainingDelete = async (logId) => {
    let result;
    if (user) { result = await deleteTrainingLog(supabase, user.id, logId); }
    else { result = deleteLocalTrainingLog(logId); }
    if (isDbError(result)) { showToast("error", "削除に失敗: " + result._error); return; }
    setTrainingLogs((prev) => prev.filter((t) => t.id !== logId));
  };

  const toggleBodyPart = (partId) => {
    setSelectedBodyParts((prev) => prev.includes(partId) ? prev.filter((p) => p !== partId) : [...prev, partId]);
  };

  const handleNotesChange = (value) => {
    setDailyNotes(value); setNotesSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setNotesSaving(true);
      let result;
      if (user) { result = await saveDailyNotes(supabase, user.id, date, value); }
      else { result = saveLocalDailyNotes(date, value); }
      setNotesSaving(false);
      if (isDbError(result)) { showToast("error", "メモの保存に失敗: " + result._error); }
      else { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }
    }, 1000);
  };

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  const handleSheetSubmit = async (data) => {
    setSaving(true);
    // [1-2] UIタイムアウトガード
    const uiTimeout = setTimeout(() => { setSaving(false); showToast("error", "タイムアウト: 接続を確認してください"); }, 20000);
    const logData = { date, ...data };
    let saved;
    if (user) { saved = await saveMealLog(supabase, user.id, logData); }
    else { saved = saveLocalMealLog(logData); }
    clearTimeout(uiTimeout);
    setSaving(false);
    if (isDbError(saved)) {
      showToast("error", "記録の保存に失敗: " + saved._error);
    } else if (saved) {
      showToast("success", "記録しました");
      setLogs((prev) => [...prev, saved]);
      setSheetOpen(false);
      if (showHint) dismissHint();
    } else { showToast("error", "保存に失敗しました"); }
  };

  const handleDelete = async (logId) => {
    let result;
    if (user) { result = await deleteMealLog(supabase, user.id, logId); }
    else { result = deleteLocalMealLog(logId); }
    if (isDbError(result)) { showToast("error", "削除に失敗: " + result._error); return; }
    setLogs((prev) => prev.filter((l) => l.id !== logId));
  };

  const handleQuickLog = async (routine) => {
    if (savingRoutineId) return;
    setSavingRoutineId(routine.id);
    // [1-2] UIタイムアウトガード
    const uiTimeout = setTimeout(() => { setSavingRoutineId(null); showToast("error", "タイムアウト: 接続を確認してください"); }, 20000);
    const logData = {
      date, mealName: routine.meal_name,
      price: routine.price != null ? Number(routine.price) : null,
      protein: routine.protein != null ? Number(routine.protein) : null,
      fat: routine.fat != null ? Number(routine.fat) : null,
      carbs: routine.carbs != null ? Number(routine.carbs) : null,
      mealIndex: activeMealIndex,
    };
    let saved;
    if (user) { saved = await saveMealLog(supabase, user.id, logData); }
    else { saved = saveLocalMealLog(logData); }
    clearTimeout(uiTimeout);
    setSavingRoutineId(null);
    if (isDbError(saved)) {
      showToast("error", "記録の保存に失敗: " + saved._error);
    } else if (saved) {
      showToast("success", `${routine.meal_name} を記録`);
      setLogs((prev) => [...prev, saved]);
    } else { showToast("error", "記録に失敗しました"); }
  };

  /* ── Computed ── */
  const totals = logs.reduce(
    (acc, l) => ({ price: acc.price + (l.price || 0), protein: acc.protein + (l.protein || 0), fat: acc.fat + (l.fat || 0), carbs: acc.carbs + (l.carbs || 0) }),
    { price: 0, protein: 0, fat: 0, carbs: 0 }
  );
  const totalCal = Math.round(totals.protein * 4 + totals.fat * 9 + totals.carbs * 4);
  const hasGoals = goals && (goals.budget || goals.protein || goals.fat || goals.carbs);
  const isToday = date === today();
  const calGoal = (goals?.protein && goals?.fat && goals?.carbs)
    ? Math.round(goals.protein * 4 + goals.fat * 9 + goals.carbs * 4) : null;

  const filteredLogs = activeMealIndex === null ? logs : logs.filter((l) => l.meal_index === activeMealIndex);

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
          {/* Date picker skeleton */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ ...sk, width: 36, height: 36, borderRadius: 10 }} />
            <div style={{ ...sk, flex: 1, height: 40 }} />
            <div style={{ ...sk, width: 36, height: 36, borderRadius: 10 }} />
          </div>
          {/* Mini dashboard skeleton */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ ...sk, flex: 1, height: 50, borderRadius: 10 }} />)}
          </div>
          {/* Meal section tabs skeleton */}
          <div style={{ ...sk, height: 36, borderRadius: 10, marginBottom: 16 }} />
          {/* Log items skeleton */}
          {[1,2,3].map(i => (
            <div key={i} style={{ ...sk, height: 64, borderRadius: 16, marginBottom: 10, animationDelay: `${i * 0.15}s` }} />
          ))}
          {/* Form skeleton */}
          <div style={{ ...sk, height: 160, borderRadius: 22, marginTop: 16 }} />
        </main>
        <style>{`@keyframes shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.orb1} />
      <div style={S.orb2} />

      {/* ── Header ── */}
      <header style={S.header}>
        <button onClick={() => router.push("/")} style={S.backBtn}>← 戻る</button>
        <h1 style={S.title}>食事の記録</h1>
      </header>

      <main style={S.main}>
        {/* ── Onboarding Hint Banner (show once) ── */}
        {showHint && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(168,139,250,0.08)", border: "1px solid rgba(168,139,250,0.2)",
            borderRadius: 14, padding: "12px 16px", marginBottom: 16,
            animation: "fadeUp 0.4s ease-out",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, flex: 1 }}>
              食品名を入力するだけで<span style={{ color: "#a78bfa", fontWeight: 700 }}>AIがPFCと価格を自動推測</span>します
            </span>
            <button onClick={dismissHint} style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.3)", fontSize: 16, padding: "2px 4px", flexShrink: 0,
              lineHeight: 1,
            }}>✕</button>
          </div>
        )}

        {/* ── Date Picker ── */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setDate(d => { const p = new Date(d); p.setDate(p.getDate() - 1); return p.toISOString().slice(0, 10); })} style={S.dateBtn}>◀</button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
          <button onClick={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n.toISOString().slice(0, 10); })} style={S.dateBtn}>▶</button>
          {date !== today() && (
            <button onClick={() => setDate(today())} style={{ ...S.dateBtn, fontSize: 10, padding: "6px 10px" }}>今日</button>
          )}
        </div>

        {/* ── Mini Dashboard (compact bar) ── */}
        {hasGoals && isToday && (
          <MiniDashboard totals={totals} totalCal={totalCal} goals={goals} calGoal={calGoal} />
        )}

        {/* ── Meal Section Tabs ── */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <button
              onClick={() => setActiveMealIndex(null)}
              style={{
                flex: 1, padding: "10px 0", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: activeMealIndex === null ? "rgba(34,197,94,0.12)" : "transparent",
                color: activeMealIndex === null ? "#4ade80" : "rgba(255,255,255,0.35)",
                transition: "all 0.2s",
              }}
            >全て</button>
            {Array.from({ length: mealCount }, (_, i) => i + 1).map((idx) => (
              <button key={idx} onClick={() => setActiveMealIndex(idx)} style={{
                flex: 1, padding: "10px 0", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
                background: activeMealIndex === idx ? "rgba(34,197,94,0.12)" : "transparent",
                color: activeMealIndex === idx ? "#4ade80" : "rgba(255,255,255,0.35)",
                transition: "all 0.2s",
              }}>{idx}食目</button>
            ))}
          </div>
        </div>

        {/* ── Quick Log: Routines (always visible at top) ── */}
        {routines.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={14} strokeWidth={1.5} />ルーティン
              </span>
              <a href="/routines" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>編集 →</a>
            </div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {routines.map((r) => {
                const isSaving = savingRoutineId === r.id;
                return (
                  <button key={r.id} onClick={() => handleQuickLog(r)} disabled={!!savingRoutineId} style={{
                    ...S.routineChip,
                    opacity: isSaving ? 0.5 : savingRoutineId ? 0.7 : 1,
                    cursor: savingRoutineId ? "not-allowed" : "pointer",
                  }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, background: (r.emoji && r.emoji.startsWith("#")) ? r.emoji : "#4ade80", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UtensilsCrossed size={15} strokeWidth={1.5} color="white" />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 85 }}>
                      {isSaving ? "記録中..." : r.meal_name}
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {r.protein != null && <span style={{ ...S.chipPfc, color: "#f87171" }}>P{Number(r.protein).toFixed(0)}</span>}
                      {r.fat != null && <span style={{ ...S.chipPfc, color: "#facc15" }}>F{Number(r.fat).toFixed(0)}</span>}
                      {r.carbs != null && <span style={{ ...S.chipPfc, color: "#60a5fa" }}>C{Number(r.carbs).toFixed(0)}</span>}
                    </div>
                    {r.price != null && <span style={S.chipBadge}>¥{Number(r.price).toLocaleString()}</span>}
                  </button>
                );
              })}
              <a href="/routines" style={S.routineAdd}>
                <Plus size={20} strokeWidth={1.5} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>追加</span>
              </a>
            </div>
          </div>
        )}

        {routines.length === 0 && (
          <a href="/routines" style={{ display: "block", textDecoration: "none", ...S.card, textAlign: "center", padding: "20px", marginBottom: 20 }}>
            <Zap size={20} strokeWidth={1.5} color="rgba(255,255,255,0.2)" style={{ marginBottom: 6 }} />
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              よく食べるものを登録してワンタップ記録
            </div>
          </a>
        )}

        {/* ── Manual Input Button (opens bottom sheet) ── */}
        <button onClick={() => setSheetOpen(true)} style={S.addBtn}>
          <Plus size={18} strokeWidth={2} />
          手動で追加
        </button>

        {/* ── Log List ── */}
        {filteredLogs.length > 0 ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10, fontWeight: 600 }}>
              {date === today() ? "今日" : new Date(date + "T00:00").toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}の記録
              <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.35)" }}>{filteredLogs.length}件</span>
            </div>
            {filteredLogs.map((log) => (
              <div key={log.id} style={S.logItem}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
                    {log.meal_index != null && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#4ade80", flexShrink: 0 }}>
                        {log.meal_index}食目
                      </span>
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.meal_name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, display: "flex", gap: 10 }}>
                    {log.price != null && <span>¥{log.price}</span>}
                    {log.protein != null && <span style={{ color: "#f87171" }}>P{log.protein}g</span>}
                    {log.fat != null && <span style={{ color: "#facc15" }}>F{log.fat}g</span>}
                    {log.carbs != null && <span style={{ color: "#60a5fa" }}>C{log.carbs}g</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(log.id)} style={S.deleteBtn} aria-label="削除">
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <UtensilsCrossed size={36} strokeWidth={1.5} color="rgba(255,255,255,0.1)" />
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: "12px 0 4px", fontWeight: 600 }}>
              {activeMealIndex !== null ? `${activeMealIndex}食目はまだ` : "まだ記録がありません"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 12, margin: 0 }}>
              ルーティンをタップ or 手動で追加
            </p>
          </div>
        )}

        {/* ── Summary (when no dashboard) ── */}
        {logs.length > 0 && !hasGoals && (
          <div style={S.summaryCard}>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80", fontFamily: "var(--font-mono)" }}>{totalCal}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>kcal</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#facc15", fontFamily: "var(--font-mono)" }}>¥{totals.price.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>食費</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
              <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>P {Math.round(totals.protein)}<span style={{ fontSize: 8, fontWeight: 400, opacity: 0.5 }}>g</span></span>
              <span style={{ fontSize: 11, color: "#facc15", fontWeight: 600 }}>F {Math.round(totals.fat)}<span style={{ fontSize: 8, fontWeight: 400, opacity: 0.5 }}>g</span></span>
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600 }}>C {Math.round(totals.carbs)}<span style={{ fontSize: 8, fontWeight: 400, opacity: 0.5 }}>g</span></span>
            </div>
          </div>
        )}

        {/* ── Collapsible Sections Divider ── */}
        <div style={{ margin: "28px 0 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }} />

        {/* ── Weight (collapsible) ── */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <button onClick={() => setWeightOpen(!weightOpen)} style={S.accordionBtn}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Scale size={16} strokeWidth={1.5} color="#4ade80" />
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>体重</span>
              {!weightOpen && morningWeight && (
                <span style={{ fontSize: 14, color: "#4ade80", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {morningWeight}<span style={{ fontSize: 9, fontWeight: 400, opacity: 0.5 }}>kg</span>
                </span>
              )}
            </div>
            <ChevronDown size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{ transition: "transform 0.25s", transform: weightOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          <div style={{ maxHeight: weightOpen ? 400 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.25s ease", opacity: weightOpen ? 1 : 0 }}>
            <div style={{ paddingTop: 18 }}>
              {/* Tab */}
              <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 16 }}>
                {["morning", "night"].map((tab) => (
                  <button key={tab} onClick={() => setWeightTab(tab)} style={{
                    flex: 1, padding: "8px 0", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    background: weightTab === tab ? (tab === "morning" ? "rgba(74,222,128,0.15)" : "rgba(245,158,11,0.15)") : "transparent",
                    color: weightTab === tab ? (tab === "morning" ? "#4ade80" : "#f59e0b") : "rgba(255,255,255,0.35)",
                    transition: "all 0.2s",
                  }}>
                    {tab === "morning" ? "朝" : "夜"}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div style={S.fieldWrap}>
                  <label style={S.fieldLabel}>体重</label>
                  <div style={S.numWrap}>
                    <input type="number" inputMode="decimal" step="0.1" min="30" max="200"
                      value={weightTab === "morning" ? morningWeight : nightWeight}
                      onChange={(e) => weightTab === "morning" ? setMorningWeight(e.target.value) : setNightWeight(e.target.value)}
                      placeholder="—" style={{ ...S.numInput, color: weightTab === "morning" ? "#4ade80" : "#f59e0b" }} />
                    <span style={S.unit}>kg</span>
                  </div>
                </div>
                <div style={S.fieldWrap}>
                  <label style={S.fieldLabel}>体脂肪率</label>
                  <div style={S.numWrap}>
                    <input type="number" inputMode="decimal" step="0.1" min="1" max="60"
                      value={weightTab === "morning" ? morningBodyFat : nightBodyFat}
                      onChange={(e) => weightTab === "morning" ? setMorningBodyFat(e.target.value) : setNightBodyFat(e.target.value)}
                      placeholder="—" style={{ ...S.numInput, color: weightTab === "morning" ? "#4ade80" : "#f59e0b" }} />
                    <span style={S.unit}>%</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {(morningWeight || nightWeight) && (
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 14, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  {morningWeight && <span>朝 <span style={{ color: "#4ade80", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{morningWeight}</span>kg</span>}
                  {nightWeight && <span>夜 <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{nightWeight}</span>kg</span>}
                  {morningWeight && nightWeight && (
                    <span style={{ color: "rgba(255,255,255,0.25)" }}>
                      差 <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)" }}>
                        {(Number(nightWeight) - Number(morningWeight) >= 0 ? "+" : "")}{(Number(nightWeight) - Number(morningWeight)).toFixed(1)}
                      </span>kg
                    </span>
                  )}
                </div>
              )}

              <button onClick={handleWeightSave} disabled={weightSaving} style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700,
                background: weightSaving ? "#555" : weightSaved ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.06)",
                color: weightSaved ? "#4ade80" : "rgba(255,255,255,0.6)",
                cursor: weightSaving ? "not-allowed" : "pointer", transition: "all 0.2s",
              }}>
                {weightSaving ? "保存中..." : weightSaved ? "保存しました" : "保存"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Training (collapsible) ── */}
        <div style={{ ...S.card, marginBottom: 16 }}>
          <button onClick={() => setTrainingOpen(!trainingOpen)} style={S.accordionBtn}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Dumbbell size={16} strokeWidth={1.5} color="#a78bfa" />
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>トレーニング</span>
              {!trainingOpen && trainingLogs.length > 0 && (
                <span style={{ fontSize: 11, color: "#a78bfa" }}>{trainingLogs.length}件</span>
              )}
            </div>
            <ChevronDown size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{ transition: "transform 0.25s", transform: trainingOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          <div style={{ maxHeight: trainingOpen ? 800 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.25s ease", opacity: trainingOpen ? 1 : 0 }}>
            <div style={{ paddingTop: 18 }}>
              {/* Body part chips */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "block", marginBottom: 8 }}>部位</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {BODY_PART_OPTIONS.map((part) => {
                    const selected = selectedBodyParts.includes(part.id);
                    return (
                      <button key={part.id} onClick={() => toggleBodyPart(part.id)} style={{
                        padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${selected ? part.color : "rgba(255,255,255,0.1)"}`,
                        background: selected ? `${part.color}20` : "rgba(255,255,255,0.03)",
                        color: selected ? part.color : "rgba(255,255,255,0.4)", transition: "all 0.15s",
                      }}>{part.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Intensity */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "block", marginBottom: 8 }}>強度</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button key={level} onClick={() => setTrainingIntensity(level)} style={{
                      background: "transparent", border: "none", cursor: "pointer", padding: 4,
                      transform: trainingIntensity >= level ? "scale(1.1)" : "scale(1)", transition: "transform 0.15s",
                    }}>
                      <Star size={28} fill={trainingIntensity >= level ? "#fbbf24" : "transparent"} color={trainingIntensity >= level ? "#fbbf24" : "rgba(255,255,255,0.15)"} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600, display: "block", marginBottom: 8 }}>時間</label>
                <div style={S.numWrap}>
                  <input type="number" inputMode="numeric" min="0" max="600" value={trainingDuration} onChange={(e) => setTrainingDuration(e.target.value)}
                    placeholder="60" style={{ ...S.numInput, color: "#a78bfa" }} />
                  <span style={S.unit}>分</span>
                </div>
              </div>

              {/* Notes (hidden toggle) */}
              <div style={{ marginBottom: 18 }}>
                {trainingNotes ? (
                  <textarea value={trainingNotes} onChange={(e) => setTrainingNotes(e.target.value)}
                    placeholder="ベンチ 80kg×8×3" rows={3} style={S.notesInput} />
                ) : (
                  <button onClick={() => setTrainingNotes(" ")} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer", padding: 0 }}>
                    + メモを追加
                  </button>
                )}
              </div>

              <button onClick={handleTrainingSave} disabled={trainingSaving || selectedBodyParts.length === 0} style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700,
                background: trainingSaving ? "#555" : selectedBodyParts.length === 0 ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                color: selectedBodyParts.length === 0 ? "rgba(255,255,255,0.2)" : "#fff",
                cursor: trainingSaving || selectedBodyParts.length === 0 ? "not-allowed" : "pointer",
                boxShadow: selectedBodyParts.length > 0 ? "0 4px 20px rgba(139,92,246,0.3)" : "none", transition: "all 0.2s",
              }}>
                {trainingSaving ? "記録中..." : "記録する"}
              </button>
            </div>

            {/* Existing logs */}
            {trainingLogs.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {trainingLogs.map((tl) => (
                  <div key={tl.id} style={{ padding: "12px 14px", background: "rgba(168,139,250,0.04)", border: "1px solid rgba(168,139,250,0.1)", borderRadius: 14, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {(tl.body_parts || []).map((partId) => {
                          const part = BODY_PART_OPTIONS.find((p) => p.id === partId);
                          return (
                            <span key={partId} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: `${part?.color || "#a78bfa"}20`, color: part?.color || "#a78bfa" }}>
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
                      {tl.duration_minutes != null && <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{tl.duration_minutes}分</span>}
                    </div>
                    {tl.notes && tl.notes.trim() && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{tl.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Notes (collapsible) ── */}
        <div style={{ ...S.card, marginBottom: 20 }}>
          <button onClick={() => setNotesOpen(!notesOpen)} style={S.accordionBtn}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PenLine size={16} strokeWidth={1.5} color="#60a5fa" />
              <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>メモ</span>
              {notesSaving && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>保存中...</span>}
              {notesSaved && !notesSaving && <span style={{ fontSize: 10, color: "#4ade80" }}>保存済み</span>}
            </div>
            <ChevronDown size={18} strokeWidth={1.5} color="rgba(255,255,255,0.3)" style={{ transition: "transform 0.25s", transform: notesOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          <div style={{ maxHeight: notesOpen ? 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease, opacity 0.25s ease", opacity: notesOpen ? 1 : 0 }}>
            <div style={{ paddingTop: 14 }}>
              <textarea
                value={dailyNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="体調、睡眠、気分など自由に"
                rows={2}
                style={S.notesInput}
              />
            </div>
          </div>
        </div>

        {/* spacer for FAB */}
        <div style={{ height: 80 }} />
      </main>

      {/* ── Bottom Sheet ── */}
      <ManualInputSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleSheetSubmit}
        saving={saving}
        activeMealIndex={activeMealIndex}
      />

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

/* ── Styles ── */
const S = {
  page: { minHeight: "100vh", background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)", color: "white", position: "relative", overflow: "hidden" },
  orb1: { position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle,rgba(34,197,94,0.06)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  orb2: { position: "fixed", bottom: -150, left: -150, width: 400, height: 400, background: "radial-gradient(circle,rgba(59,130,246,0.05)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },

  header: { padding: "20px 24px 12px", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 },
  backBtn: { padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  title: { fontSize: 18, fontWeight: 700, margin: 0, color: "rgba(255,255,255,0.85)" },
  main: { maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" },

  dateBtn: { width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  dateInput: { flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#4ade80", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600, outline: "none", colorScheme: "dark" },

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 22, padding: "22px 20px", marginBottom: 14 },

  addBtn: {
    width: "100%", padding: "14px 0", borderRadius: 14, border: "1px dashed rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "all 0.15s",
  },

  accordionBtn: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "transparent", border: "none", cursor: "pointer", padding: 0,
  },

  fieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  numWrap: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 8px" },
  numInput: { width: "100%", background: "transparent", border: "none", outline: "none", color: "#22c55e", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, textAlign: "right", minWidth: 0 },
  unit: { fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 },

  notesInput: { width: "100%", padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif", resize: "vertical", lineHeight: 1.6 },

  summaryCard: { background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.12)", borderRadius: 18, padding: "18px 20px", marginTop: 20 },

  logItem: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 14, marginBottom: 8 },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  routineChip: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, minWidth: 95, flexShrink: 0, transition: "all 0.15s" },
  chipBadge: { fontSize: 10, fontWeight: 600, color: "#4ade80", fontFamily: "var(--font-mono)" },
  chipPfc: { fontSize: 9, fontWeight: 600, fontFamily: "var(--font-mono)" },
  routineAdd: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 18, minWidth: 75, flexShrink: 0, textDecoration: "none", color: "rgba(255,255,255,0.3)" },

  /* Bottom sheet styles */
  sheetTextInput: { width: "100%", padding: "14px 16px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 16, outline: "none", boxSizing: "border-box", fontFamily: "'Noto Sans JP',sans-serif", marginBottom: 16 },
  sheetFieldWrap: { display: "flex", flexDirection: "column", gap: 6 },
  sheetFieldLabel: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  sheetNumWrap: { display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 8px" },
  sheetNumInput: { width: "100%", background: "transparent", border: "none", outline: "none", color: "#22c55e", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, textAlign: "right", minWidth: 0 },
  sheetUnit: { fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 },
  quickBtn: { flex: 1, padding: "5px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.4)", cursor: "pointer", textAlign: "center", transition: "all 0.15s" },
};

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { loadProfile, saveProfile, loadBodyMetrics } from "@/lib/db";
import AuthGate from "@/components/AuthGate";
import { Lock, CheckCircle, Bot, Settings, BarChart3, Target, ShoppingCart, Lightbulb, UtensilsCrossed, RefreshCw, PenLine, ClipboardList, Dumbbell } from "lucide-react";

export default function CoachPage() {
  const router = useRouter();
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [hasMetrics, setHasMetrics] = useState(null); // null = checking

  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);
  const abortRef = useRef(null);

  // Auth (ゲストはプレミアムウォール表示)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user); // null = ゲスト
      if (user) {
        const p = await loadProfile(supabase, user.id);
        setProfile(p);
        const m = await loadBodyMetrics(supabase, user.id, 14);
        setHasMetrics(m && m.length > 0);
      }
      setLoading(false);
    }).catch(() => { setLoading(false); });
  }, [supabase]);

  const handleAuthChange = useCallback((authUser) => {
    if (authUser) {
      window.location.reload();
    }
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const canAnalyze = profile && (profile.protein_goal || profile.budget) && hasMetrics;

  const handleAnalyze = useCallback(async () => {
    if (analyzing) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`リクエスト制限中です。${data.retryAfter || 60}秒後に再試行してください。`);
        } else {
          setError(data.error || "分析に失敗しました");
        }
        return;
      }

      setResult(data.result);
    } catch (e) {
      if (e.name !== "AbortError") {
        setError("通信エラーが発生しました");
      }
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing]);

  const handleApplyMacros = async () => {
    if (!result?.newMacros || !user || applying) return;
    setApplying(true);

    await saveProfile(supabase, user.id, {
      ...profileToSaveData(profile),
      proteinGoal: result.newMacros.protein,
      fatGoal: result.newMacros.fat,
      carbsGoal: result.newMacros.carbs,
      budget: result.newMacros.budget || profile?.budget,
    });

    setApplying(false);
    showToast("success", "目標を適用しました");

    setProfile((prev) => ({
      ...prev,
      protein_goal: result.newMacros.protein,
      fat_goal: result.newMacros.fat,
      carbs_goal: result.newMacros.carbs,
      budget: result.newMacros.budget || prev?.budget,
    }));
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

  // ゲスト: プレミアムウォール
  if (!loading && !user) {
    return (
      <div style={S.page}>
        <div style={S.orb1} />
        <div style={S.orb2} />
        <header style={S.header}>
          <button onClick={() => router.push("/")} style={S.backBtn}>← 戻る</button>
          <h1 style={S.title}>AIコーチ</h1>
        </header>
        <main style={S.main}>
          <div style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(96,165,250,0.08))",
            border: "1px solid rgba(139,92,246,0.25)",
            borderRadius: 24, padding: "40px 24px", textAlign: "center",
          }}>
            <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
              <Lock size={48} strokeWidth={1.5} color="rgba(167,139,250,0.6)" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)", margin: "0 0 8px" }}>
              AIコーチを利用する
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 20px", lineHeight: 1.7 }}>
              無料アカウントを作成すると、体重推移・PFC・予算をAIが分析し、買い物リストまで自動生成します
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center", marginBottom: 20 }}>
              {["体重推移のAI分析", "PFC目標の自動調整", "コスパ最強の買い物リスト"].map((t) => (
                <div key={t} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={12} strokeWidth={1.5} color="#a78bfa" /> {t}
                </div>
              ))}
            </div>
            <div style={{ display: "inline-block" }}>
              <AuthGate supabase={supabase} onAuthChange={handleAuthChange} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const statusColor = result?.status === "順調" ? "#4ade80"
    : result?.status === "停滞気味" ? "#facc15" : "#f87171";

  return (
    <div style={S.page}>
      <div style={S.orb1} />
      <div style={S.orb2} />

      <header style={S.header}>
        <button onClick={() => router.push("/")} style={S.backBtn}>← 戻る</button>
        <h1 style={S.title}>AIコーチ</h1>
      </header>

      <main style={S.main}>

        {/* Prerequisites check */}
        {!canAnalyze && !loading && (
          <div style={{ ...S.card, textAlign: "center", padding: "30px 20px" }}>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
              <Bot size={32} strokeWidth={1.5} color="rgba(255,255,255,0.3)" />
            </div>
            {(!profile || (!profile.protein_goal && !profile.budget)) && (
              <>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>
                  PFC目標や予算を設定してからAI分析を利用できます
                </p>
                <a href="/settings" style={S.linkBtn}>
                  <Settings size={12} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />設定ページへ
                </a>
              </>
            )}
            {profile && (profile.protein_goal || profile.budget) && !hasMetrics && (
              <>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 8px" }}>
                  体重を記録してからAI分析を利用できます
                </p>
                <a href="/progress" style={S.linkBtn}>
                  <BarChart3 size={12} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />体重記録ページへ
                </a>
              </>
            )}
          </div>
        )}

        {/* Analyze button */}
        {canAnalyze && !analyzing && (
          <button onClick={handleAnalyze} style={S.analyzeBtn}>
            <Bot size={24} strokeWidth={1.5} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>週次レポートを生成</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>体重・目標・予算を分析</span>
          </button>
        )}

        {/* Loading animation */}
        {analyzing && (
          <div style={{ ...S.card, textAlign: "center", padding: "40px 20px" }}>
            <div style={S.pulseWrap}>
              <span style={S.pulseDot} />
              <span style={{ ...S.pulseDot, animationDelay: "0.2s" }} />
              <span style={{ ...S.pulseDot, animationDelay: "0.4s" }} />
            </div>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 16 }}>
              分析中...
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              データを分析しています
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ ...S.card, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
            {canAnalyze && (
              <button onClick={handleAnalyze} style={{ ...S.retryBtn, marginTop: 12 }}>再試行</button>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Status card */}
            <div style={{ ...S.card, borderColor: `${statusColor}33` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0, boxShadow: `0 0 8px ${statusColor}40` }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: statusColor }}>{result.status}</div>
                  {result.weightTrend && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mono)" }}>
                      週間変化: {result.weightTrend.weeklyChange > 0 ? "+" : ""}{result.weightTrend.weeklyChange}kg
                    </div>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.7 }}>
                {result.summary}
              </p>
            </div>

            {/* New macros card */}
            {result.newMacros && (
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Target size={14} strokeWidth={1.5} />推奨マクロ目標
                </div>
                {result.macroReason && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 12px", lineHeight: 1.6 }}>
                    {result.macroReason}
                  </p>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  <div style={S.macroCell}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>P</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#f87171", fontFamily: "var(--font-mono)" }}>
                      {result.newMacros.protein}
                    </span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>g</span>
                  </div>
                  <div style={S.macroCell}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>F</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#facc15", fontFamily: "var(--font-mono)" }}>
                      {result.newMacros.fat}
                    </span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>g</span>
                  </div>
                  <div style={S.macroCell}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>C</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#60a5fa", fontFamily: "var(--font-mono)" }}>
                      {result.newMacros.carbs}
                    </span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>g</span>
                  </div>
                  <div style={S.macroCell}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)" }}>予算</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                      ¥{result.newMacros.budget}
                    </span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>/日</span>
                  </div>
                </div>

                {profile && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 12, textAlign: "center" }}>
                    現在: P{profile.protein_goal || "?"}g F{profile.fat_goal || "?"}g C{profile.carbs_goal || "?"}g / ¥{profile.budget || "?"}
                  </div>
                )}

                <button onClick={handleApplyMacros} disabled={applying} style={{
                  ...S.applyBtn,
                  opacity: applying ? 0.6 : 1,
                  cursor: applying ? "not-allowed" : "pointer",
                }}>
                  {applying ? "適用中..." : "この目標を適用"}
                </button>
              </div>
            )}

            {/* Grocery list card */}
            {result.groceryList && result.groceryList.length > 0 && (
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShoppingCart size={14} strokeWidth={1.5} />週間買い物リスト
                </div>
                {result.groceryList.map((item, i) => (
                  <div key={i} style={S.groceryRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{item.item}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                        {item.amount}{item.note ? ` — ${item.note}` : ""}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      ¥{Number(item.estPrice).toLocaleString()}
                    </span>
                  </div>
                ))}
                {result.weeklyTotal && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, marginTop: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>合計（1週間分）</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                      ¥{Number(result.weeklyTotal).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Advice card */}
            {(result.advice || result.mealTip) && (
              <div style={{ ...S.card, background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.12)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lightbulb size={14} strokeWidth={1.5} />改善ポイント
                </div>
                {result.advice && (
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 8px", lineHeight: 1.7 }}>
                    {result.advice}
                  </p>
                )}
                {result.mealTip && (
                  <p style={{ fontSize: 12, color: "rgba(96,165,250,0.7)", margin: 0, lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 6 }}>
                    <UtensilsCrossed size={12} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />{result.mealTip}
                  </p>
                )}
              </div>
            )}

            {/* Training analysis card */}
            {result.trainingAnalysis && (
              <div style={{ ...S.card, background: "rgba(168,139,250,0.05)", border: "1px solid rgba(168,139,250,0.12)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Dumbbell size={14} strokeWidth={1.5} />トレーニング分析
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.7 }}>
                  {result.trainingAnalysis}
                </p>
              </div>
            )}

            {/* Condition context + Meal analysis card */}
            {(result.conditionContext || result.mealAnalysis) && (
              <div style={{ ...S.card, background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)" }}>
                {result.conditionContext && (
                  <div style={{ marginBottom: result.mealAnalysis ? 14 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <PenLine size={14} strokeWidth={1.5} />体調メモ分析
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.7 }}>
                      {result.conditionContext}
                    </p>
                  </div>
                )}
                {result.mealAnalysis && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <ClipboardList size={14} strokeWidth={1.5} />食事記録分析
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.7 }}>
                      {result.mealAnalysis}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Re-analyze button */}
            <button onClick={handleAnalyze} style={S.reAnalyzeBtn}>
              <RefreshCw size={12} strokeWidth={1.5} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />再分析
            </button>
          </>
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
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Convert profile DB row back to saveProfile format
function profileToSaveData(p) {
  if (!p) return {};
  return {
    weight: p.weight,
    height: p.height,
    age: p.age,
    bodyFat: p.body_fat,
    gender: p.gender,
    goal: p.goal,
    activity: p.activity,
    goalWeight: p.goal_weight,
    budget: p.budget,
    proteinGoal: p.protein_goal,
    fatGoal: p.fat_goal,
    carbsGoal: p.carbs_goal,
    mealCount: p.meal_count,
  };
}

const S = {
  page: { minHeight: "100vh", background: "linear-gradient(170deg,#0a0a0f 0%,#0d1117 40%,#0f1923 100%)", color: "white", position: "relative", overflow: "hidden" },
  orb1: { position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle,rgba(96,165,250,0.06)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  orb2: { position: "fixed", bottom: -150, left: -150, width: 400, height: 400, background: "radial-gradient(circle,rgba(34,197,94,0.05)0%,transparent 70%)", borderRadius: "50%", pointerEvents: "none" },
  header: { padding: "18px 24px 10px", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 },
  backBtn: { padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  title: { fontSize: 18, fontWeight: 700, margin: 0, color: "rgba(255,255,255,0.85)" },
  main: { maxWidth: 480, margin: "0 auto", padding: "0 16px 100px" },

  card: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "20px 18px", marginBottom: 14 },

  linkBtn: { display: "inline-block", padding: "8px 16px", borderRadius: 10, background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: 12, fontWeight: 600, textDecoration: "none", marginTop: 4 },

  analyzeBtn: {
    width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: "28px 20px", borderRadius: 20,
    background: "linear-gradient(135deg, rgba(96,165,250,0.12), rgba(139,92,246,0.12))",
    border: "1px solid rgba(96,165,250,0.25)", color: "#fff",
    cursor: "pointer", marginBottom: 14, transition: "all 0.2s",
  },

  pulseWrap: { display: "flex", gap: 8, justifyContent: "center" },
  pulseDot: {
    width: 10, height: 10, borderRadius: "50%", background: "#60a5fa",
    animation: "pulse 1.4s ease-in-out infinite",
    display: "inline-block",
  },

  retryBtn: { padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" },

  macroCell: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 0", background: "rgba(255,255,255,0.03)", borderRadius: 12 },

  applyBtn: {
    width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff",
    fontSize: 13, fontWeight: 700, boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
  },

  groceryRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
  },

  reAnalyzeBtn: {
    width: "100%", padding: "10px 0", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 600, cursor: "pointer",
    marginBottom: 14,
  },
};

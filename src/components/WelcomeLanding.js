"use client";

import { useRouter } from "next/navigation";
import AuthGate from "@/components/AuthGate";
import {
  Activity, Wallet, Zap, Bot,
  ArrowRight, Settings,
} from "lucide-react";

export default function WelcomeLanding({ supabase, onAuthChange }) {
  const router = useRouter();

  return (
    <div style={s.page}>
      {/* Subtle BG decoration */}
      <div style={{ position: "fixed", top: -120, right: -120, width: 400, height: 400, background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -80, left: -80, width: 300, height: 300, background: "radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

      {/* ─── Header ─── */}
      <header style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={s.logoIcon}>
            <Activity size={18} strokeWidth={1.5} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>ダツデブ</div>
            <div style={{ fontSize: 9, color: "#9ca3af", letterSpacing: 1.5, textTransform: "uppercase" }}>AI PFC × Budget Tracker</div>
          </div>
        </div>
        <AuthGate supabase={supabase} onAuthChange={onAuthChange} onSessionExpired={() => {}} />
      </header>

      {/* ─── Hero Section ─── */}
      <section style={s.hero}>
        {/* Badge */}
        <div style={s.badge}>
          <span style={s.badgeDot} />
          登録不要 · 完全無料
        </div>

        {/* Headline */}
        <h1 style={s.headline}>
          食費の限界最適化で、
          <br />
          <span style={s.headlineAccent}>体が変わる。</span>
        </h1>

        {/* Subtitle */}
        <p style={s.subtitle}>
          AI栄養管理 × 予算圧縮。
          限られた食費で最大の成果を出す、あなた専属のAIオートパイロット
        </p>

        {/* Primary CTA */}
        <button onClick={() => router.push("/settings")} style={s.ctaPrimary}>
          30秒で設定完了
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
        <p style={s.ctaSub}>アカウント登録なしですべての機能が使えます</p>
      </section>

      {/* ─── 3 Core Values ─── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <p style={s.sectionLabel}>Core Features</p>
          <h2 style={s.sectionTitle}>
            3つの<span style={{ color: "#16a34a" }}>コア機能</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Card 1: Budget Optimizer */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ ...s.iconWrap, background: "#f0fdf4" }}>
                <Wallet size={20} strokeWidth={1.5} color="#16a34a" />
              </div>
              <div>
                <h3 style={s.cardTitle}>食費の最適化</h3>
                <p style={{ ...s.cardSub, color: "#16a34a" }}>Budget Optimizer</p>
              </div>
            </div>
            <p style={s.cardBody}>
              PFC目標を100%満たしながら、食費を極限まで圧縮。AIが最適な買い物リストを自動生成します。
            </p>
          </div>

          {/* Card 2: Zero Friction Input */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ ...s.iconWrap, background: "#eff6ff" }}>
                <Zap size={20} strokeWidth={1.5} color="#2563eb" />
              </div>
              <div>
                <h3 style={s.cardTitle}>ワンタップ記録</h3>
                <p style={{ ...s.cardSub, color: "#2563eb" }}>One-Tap Logging</p>
              </div>
            </div>
            <p style={s.cardBody}>
              定番の「マイルーティン飯」を登録すれば、毎日の食事記録はワンタップ。面倒な栄養計算から解放されます。
            </p>
          </div>

          {/* Card 3: AI Coach */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <div style={{ ...s.iconWrap, background: "#f5f3ff" }}>
                <Bot size={20} strokeWidth={1.5} color="#7c3aed" />
              </div>
              <div>
                <h3 style={s.cardTitle}>文脈理解AIコーチ</h3>
                <p style={{ ...s.cardSub, color: "#7c3aed" }}>Context-Aware AI</p>
              </div>
            </div>
            <p style={s.cardBody}>
              体重推移 × 食事ログ × トレーニング記録。すべてのデータを読み取り、最適な改善提案を自動生成します。
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3 Steps ─── */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <p style={{ ...s.sectionLabel, color: "#9ca3af" }}>How It Works</p>
          <h2 style={s.sectionTitle}>
            <span style={{ color: "#16a34a" }}>3ステップ</span>で始める
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", paddingLeft: 4 }}>
          {/* Step 1 */}
          <div style={s.stepRow}>
            <div style={s.stepCol}>
              <div style={{ ...s.stepCircle, background: "#dcfce7", color: "#15803d" }}>1</div>
              <div style={s.stepLine} />
            </div>
            <div style={s.stepContent}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={s.stepTitle}>プロフィール設定</h3>
                <span style={s.stepBadge}>30秒</span>
              </div>
              <p style={s.stepBody}>
                体重・目標・1日の食費予算を入力するだけ。PFC目標はAIが自動計算します。
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div style={s.stepRow}>
            <div style={s.stepCol}>
              <div style={{ ...s.stepCircle, background: "#dbeafe", color: "#1d4ed8" }}>2</div>
              <div style={s.stepLine} />
            </div>
            <div style={s.stepContent}>
              <h3 style={s.stepTitle}>食事をワンタップ記録</h3>
              <p style={s.stepBody}>
                ルーティン飯から選ぶだけで栄養・食費を自動集計。手動入力ももちろんOK。
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div style={s.stepRow}>
            <div style={s.stepCol}>
              <div style={{ ...s.stepCircle, background: "#ede9fe", color: "#6d28d9" }}>3</div>
            </div>
            <div style={s.stepContent}>
              <h3 style={s.stepTitle}>AIが毎日分析・提案</h3>
              <p style={s.stepBody}>
                体重の変動、PFCバランス、予算消化率を総合分析。改善点を毎日お届けします。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section style={{ maxWidth: 480, margin: "0 auto", padding: "16px 20px 120px", textAlign: "center" }}>
        <div style={s.ctaCard}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
            今日から始めましょう
          </h2>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 20px" }}>
            アカウント不要。まずは目標を設定するだけ。
          </p>
          <button onClick={() => router.push("/settings")} style={s.ctaSecondary}>
            <Settings size={16} strokeWidth={1.5} />
            プロフィールを設定する
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Styles ───
const s = {
  page: {
    minHeight: "100vh",
    background: "#fafbfc",
    position: "relative",
    overflow: "hidden",
  },
  header: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
  },

  // Hero
  hero: {
    maxWidth: 480, margin: "0 auto",
    padding: "48px 20px 32px", textAlign: "center",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "6px 14px", borderRadius: 999,
    background: "#f0fdf4", border: "1px solid #bbf7d0",
    fontSize: 11, fontWeight: 600, color: "#15803d",
    marginBottom: 24,
  },
  badgeDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 6px rgba(34,197,94,0.6)",
  },
  headline: {
    fontSize: 26, fontWeight: 800, lineHeight: 1.35,
    color: "#111827", margin: "0 0 16px", letterSpacing: -0.5,
  },
  headlineAccent: {
    background: "linear-gradient(135deg, #16a34a, #059669)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: 13, lineHeight: 1.7, color: "#6b7280",
    margin: "0 auto 28px", maxWidth: 300,
  },
  ctaPrimary: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "14px 32px", borderRadius: 16, border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "white", fontSize: 15, fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(34,197,94,0.3)",
  },
  ctaSub: { fontSize: 11, color: "#9ca3af", marginTop: 12 },

  // Sections
  section: { maxWidth: 480, margin: "0 auto", padding: "24px 20px 32px" },
  sectionHeader: { textAlign: "center", marginBottom: 28 },
  sectionLabel: {
    fontSize: 10, fontWeight: 600, color: "#16a34a",
    letterSpacing: 2, textTransform: "uppercase", marginBottom: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: 700, color: "#1f2937", margin: 0 },

  // Value Cards
  card: {
    background: "white", borderRadius: 16, padding: 20,
    border: "1px solid #f3f4f6",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#1f2937", margin: 0 },
  cardSub: { fontSize: 10, margin: "2px 0 0", fontWeight: 500 },
  cardBody: { fontSize: 12, lineHeight: 1.7, color: "#6b7280", margin: 0 },

  // Steps
  stepRow: { display: "flex", gap: 16, alignItems: "flex-start" },
  stepCol: { display: "flex", flexDirection: "column", alignItems: "center" },
  stepCircle: {
    width: 36, height: 36, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, flexShrink: 0,
  },
  stepLine: { width: 2, height: 24, background: "#e5e7eb", margin: "4px 0" },
  stepContent: { paddingTop: 2, paddingBottom: 12 },
  stepTitle: { fontSize: 13, fontWeight: 700, color: "#1f2937", margin: 0 },
  stepBadge: {
    fontSize: 10, fontWeight: 500, color: "#6b7280",
    background: "#f3f4f6", borderRadius: 999, padding: "2px 8px",
  },
  stepBody: { fontSize: 12, lineHeight: 1.7, color: "#6b7280", margin: "6px 0 0" },

  // Final CTA
  ctaCard: {
    background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
    borderRadius: 20, padding: "32px 24px",
    border: "1px solid #bbf7d0",
  },
  ctaSecondary: {
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: "12px 28px", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "white", fontSize: 14, fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
  },
};

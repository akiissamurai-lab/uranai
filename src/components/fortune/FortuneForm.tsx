"use client";

import { useState, useMemo, type FormEvent } from "react";
import { CONFIG } from "@/lib/constants";
import {
  fortuneInputSchema,
  GENDER_LABELS,
  GENDER_KEYS,
  CATEGORY_LABELS,
  CATEGORY_KEYS,
  type FortuneInput,
} from "@/lib/validators/fortuneInput";
import { getAnimalKey, ANIMAL_LABELS } from "@/lib/fortune/animal";
import { getZodiacKey, ZODIAC_LABELS } from "@/lib/fortune/zodiac";
import type { MeResponse } from "@/types";

// ── エラーマッピング ──
const API_ERROR_MESSAGES: Record<string, string> = {
  daily_limit_reached: "本日の占い回数が上限に達しました。明日またお越しください。",
  premium_required: "この機能はプレミアムプランが必要です。",
  rate_limited: "しばらく時間をおいてからお試しください。",
  unauthorized: "ログインが必要です。",
  generation_incomplete:
    "鑑定がうまくいきませんでした。もう一度お試しください（回数は消費されていません）。",
  generation_failed:
    "鑑定中にエラーが発生しました。もう一度お試しください（回数は消費されていません）。",
  internal_server_error: "サーバーエラーが発生しました。時間をおいてお試しください。",
};

export interface FortuneResponse {
  id: string;
  output: import("@/lib/ai/schema").FortuneOutput;
  cached: boolean;
}

interface FortuneFormProps {
  me: MeResponse;
  onSubmit: (response: FortuneResponse) => void;
}

export default function FortuneForm({ me, onSubmit }: FortuneFormProps) {
  // ── フォーム state ──
  const [birthdate, setBirthdate] = useState("");
  // ── 星座を自動算出 ──
  const zodiac = useMemo(() => {
    if (!birthdate) return "";
    return getZodiacKey(birthdate);
  }, [birthdate]);
  // ── 動物占いを自動算出 ──
  const animal = useMemo(() => {
    if (!birthdate) return "";
    return getAnimalKey(birthdate);
  }, [birthdate]);
  const [gender, setGender] = useState("");
  const [category, setCategory] = useState("");
  const [freeText, setFreeText] = useState("");

  // ── UI state ──
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mode = me.plan === "premium" ? "premium" : "free";
  const remaining =
    mode === "premium"
      ? me.todayUsage.premiumRemaining
      : me.todayUsage.freeRemaining;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setApiError("");

    // ── Zod バリデーション ──
    const result = fortuneInputSchema.safeParse({
      birthdate,
      zodiac,
      animal,
      category,
      freeText,
      mode,
      ...(gender ? { gender } : {}),
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    // ── 送信 ──
    setSubmitting(true);
    try {
      const res = await fetch("/api/fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "unknown" }));
        const errorKey = body.error ?? "unknown";

        // 403 premium_required は /billing への導線
        if (errorKey === "premium_required") {
          setApiError(API_ERROR_MESSAGES[errorKey]);
          setSubmitting(false);
          return;
        }

        setApiError(
          API_ERROR_MESSAGES[errorKey] ??
            `エラーが発生しました (${res.status})`,
        );
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      onSubmit(data as FortuneResponse);
    } catch {
      setApiError("通信エラーが発生しました。ネットワークを確認してください。");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-bold text-amber-100 text-center">
        今日の運勢を占う
      </h2>

      {/* 残回数 */}
      {remaining <= 0 && (
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-3 text-sm text-amber-300 text-center">
          本日の回数上限に達しています
          {me.plan === "free" && (
            <a
              href="/billing"
              className="block mt-1 text-amber-400 underline underline-offset-2"
            >
              プレミアムにアップグレード
            </a>
          )}
        </div>
      )}

      {/* 生年月日 */}
      <Field label="生年月日" error={fieldErrors.birthdate} required>
        <input
          type="date"
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className="form-input"
          max={new Date().toISOString().slice(0, 10)}
        />
      </Field>

      {/* 星座（自動） */}
      {zodiac && (
        <div className="bg-amber-900/10 border border-amber-800/15 rounded-xl px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-200/70">星座</span>
            <span className="text-sm font-medium text-amber-100">
              {ZODIAC_LABELS[zodiac]}（自動）
            </span>
          </div>
        </div>
      )}

      {/* 動物占い（自動） */}
      {animal && (
        <div className="bg-amber-900/10 border border-amber-800/15 rounded-xl px-4 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-amber-200/70">動物占い</span>
            <span className="text-sm font-medium text-amber-100">
              {ANIMAL_LABELS[animal]}（自動算出）
            </span>
          </div>
          <p className="text-[10px] text-amber-200/30 mt-1">
            ※いまは"やさしい簡易版"でお届けしています
          </p>
        </div>
      )}

      {/* 性別（任意） */}
      <div className="space-y-1">
        <span className="text-sm text-amber-200/70">
          性別<span className="text-amber-200/30 ml-1 text-xs">（任意）</span>
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {GENDER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setGender(gender === key ? "" : key)}
              className={`py-2 rounded-lg text-xs font-medium transition-all ${
                gender === key
                  ? "bg-amber-600/80 text-amber-50"
                  : "bg-amber-900/20 text-amber-200/50 hover:bg-amber-900/30"
              }`}
            >
              {GENDER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* カテゴリ */}
      <Field label="テーマ" error={fieldErrors.category} required>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="form-input"
        >
          <option value="">選択してください</option>
          {CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </Field>

      {/* 自由テキスト */}
      <Field label="自由メッセージ（任意）" error={fieldErrors.freeText}>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          maxLength={CONFIG.MAX_FREETEXT_LENGTH}
          rows={3}
          placeholder="今日気になっていることなど…"
          className="form-input resize-none"
        />
        <p className="text-right text-xs text-amber-200/40 mt-1">
          {freeText.length} / {CONFIG.MAX_FREETEXT_LENGTH}文字
        </p>
        <p className="text-[11px] text-amber-200/30 mt-1 leading-relaxed">
          ※ この占いはエンターテインメントです。深刻なお悩みや心身の危機を感じている場合は、専門の相談窓口にご連絡ください。
        </p>
      </Field>

      {/* API エラー */}
      {apiError && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 text-center">
          {apiError}
          {apiError.includes("プレミアム") && (
            <a
              href="/billing"
              className="block mt-1 text-amber-400 underline underline-offset-2"
            >
              プレミアムプランを見る
            </a>
          )}
        </div>
      )}

      {/* 送信ボタン */}
      <button
        type="submit"
        disabled={submitting || remaining <= 0}
        className="w-full py-3 rounded-full font-bold text-lg transition-all
          bg-amber-600 text-amber-50 hover:bg-amber-500
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
            鑑定中…
          </span>
        ) : (
          "☆ 占う"
        )}
      </button>
    </form>
  );
}

// ── フィールドラッパー ──
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-amber-200/70">
        {label}
        {required && <span className="text-amber-500 ml-0.5">*</span>}
      </span>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </label>
  );
}

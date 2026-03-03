"use client";

import { useState } from "react";
import { useMe } from "@/lib/hooks/useMe";
import FortuneForm from "@/components/fortune/FortuneForm";
import type { FortuneInput } from "@/lib/validators/fortuneInput";

// T7 で FortuneStream コンポーネントを統合
// import FortuneStream from "@/components/fortune/FortuneStream";

export default function AppPage() {
  const { data, loading, error } = useMe();

  // フォーム送信後のストリーミング表示用 state
  const [submittedInput, setSubmittedInput] = useState<FortuneInput | null>(
    null,
  );

  function handleFormSubmit(input: FortuneInput) {
    setSubmittedInput(input);
  }

  function handleBack() {
    setSubmittedInput(null);
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* ユーザー状態表示 */}
        {loading && (
          <div className="text-center text-amber-200/40 text-sm animate-pulse">
            読み込み中...
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {data && !submittedInput && (
          <>
            {/* ステータスバー */}
            <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4 space-y-1">
              <p className="text-xs text-amber-200/50">
                {data.user.email} ・ プラン:{" "}
                <span className="text-amber-300">
                  {data.plan === "premium" ? "プレミアム" : "無料"}
                </span>
              </p>
              <p className="text-xs text-amber-200/50">
                本日の残り回数:
                {data.plan === "premium"
                  ? ` ${data.todayUsage.premiumRemaining} / ${data.todayUsage.premiumRemaining + data.todayUsage.premiumCount}`
                  : ` ${data.todayUsage.freeRemaining} / ${data.todayUsage.freeRemaining + data.todayUsage.freeCount}`}
                {data.credits > 0 && ` ・ クレジット: ${data.credits}`}
              </p>
            </div>

            {/* 入力フォーム */}
            <FortuneForm me={data} onSubmit={handleFormSubmit} />
          </>
        )}

        {data && submittedInput && (
          <div className="space-y-4">
            {/* T7 で FortuneStream に差し替え */}
            <div className="text-center py-12 space-y-4">
              <div className="h-8 w-8 mx-auto border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-amber-200/60 text-sm">
                鑑定結果のストリーミング表示（T7で実装）
              </p>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="w-full py-2 text-sm text-amber-200/50 hover:text-amber-200 transition-colors"
            >
              ← もう一度占う
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

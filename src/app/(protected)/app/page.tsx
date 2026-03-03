"use client";

import { useState } from "react";
import { useMe } from "@/lib/hooks/useMe";
import FortuneForm from "@/components/fortune/FortuneForm";
import FortuneResult from "@/components/fortune/FortuneResult";
import DailyCard from "@/components/daily/DailyCard";
import type { FortuneResponse } from "@/components/fortune/FortuneForm";

export default function AppPage() {
  const { data, loading, error } = useMe();

  const [fortuneResult, setFortuneResult] = useState<FortuneResponse | null>(
    null,
  );

  function handleFormSubmit(response: FortuneResponse) {
    setFortuneResult(response);
  }

  function handleBack() {
    setFortuneResult(null);
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

        {data && !fortuneResult && (
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

            {/* 今日の余白便り */}
            <DailyCard initialZodiac={null} />

            {/* 入力フォーム */}
            <FortuneForm me={data} onSubmit={handleFormSubmit} />
          </>
        )}

        {data && fortuneResult && (
          <FortuneResult output={fortuneResult.output} onBack={handleBack} />
        )}
      </div>
    </main>
  );
}

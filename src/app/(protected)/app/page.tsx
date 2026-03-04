"use client";

import { useState, useEffect } from "react";
import { useMe } from "@/lib/hooks/useMe";
import FortuneForm from "@/components/fortune/FortuneForm";
import FortuneResult from "@/components/fortune/FortuneResult";
import DailyCard from "@/components/daily/DailyCard";
import { trackEvent } from "@/lib/trackEvent";
import type { FortuneResponse } from "@/components/fortune/FortuneForm";

function AppSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ステータスバー */}
      <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4 space-y-2">
        <div className="skeleton h-3 w-48" />
        <div className="skeleton h-3 w-36" />
      </div>
      {/* DailyCard */}
      <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4">
        <div className="skeleton h-4 w-32" />
      </div>
      {/* フォーム */}
      <div className="space-y-5">
        <div className="skeleton h-6 w-40 mx-auto" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function AppPage() {
  const { data, loading, error, refresh } = useMe();

  // /app 到達時に login_success イベントを送信（5分重複抑止は API 側で統一）
  useEffect(() => {
    trackEvent("login_success");
  }, []);

  const [fortuneResult, setFortuneResult] = useState<FortuneResponse | null>(
    null,
  );

  function handleFormSubmit(response: FortuneResponse) {
    setFortuneResult(response);
    trackEvent("app_fortune_complete");
  }

  function handleBack() {
    setFortuneResult(null);
    refresh();
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* スケルトンローディング */}
        {loading && <AppSkeleton />}

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 animate-fade-in">
            {error}
          </div>
        )}

        {data && !fortuneResult && (
          <div className="space-y-6 animate-fade-in-up">
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
          </div>
        )}

        {data && fortuneResult && (
          <FortuneResult output={fortuneResult.output} onBack={handleBack} />
        )}
      </div>
    </main>
  );
}

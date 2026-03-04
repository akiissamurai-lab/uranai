"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/hooks/useMe";
import FortuneForm from "@/components/fortune/FortuneForm";
import FortuneResult from "@/components/fortune/FortuneResult";
import DailyCard from "@/components/daily/DailyCard";
import { trackEvent } from "@/lib/trackEvent";
import { useFortuneStream } from "@/lib/hooks/useFortuneStream";
import type { FortuneInput } from "@/lib/validators/fortuneInput";

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
  const { data, loading, error: meError, refresh } = useMe();

  // /app 到達時に login_success イベントを送信（5分重複抑止は API 側で統一）
  useEffect(() => {
    trackEvent("login_success");
  }, []);

  const fortune = useFortuneStream();

  // ストリーム完了時にイベント送信
  useEffect(() => {
    if (fortune.meta && !fortune.isStreaming) {
      trackEvent("app_fortune_complete");
    }
  }, [fortune.meta, fortune.isStreaming]);

  function handleFormSubmit(input: FortuneInput) {
    fortune.submit(input);
  }

  function handleBack() {
    fortune.reset();
    refresh();
  }

  // フォーム表示判定: output がない & ストリーム中でもない
  const showForm = !fortune.output && !fortune.isStreaming;

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* スケルトンローディング */}
        {loading && <AppSkeleton />}

        {meError && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 animate-fade-in">
            {meError}
          </div>
        )}

        {data && showForm && (
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

            {/* API エラー */}
            {fortune.error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 text-center animate-fade-in">
                {fortune.error}
                {fortune.errorCode === "premium_required" && (
                  <a
                    href="/billing"
                    className="block mt-1 text-amber-400 underline underline-offset-2"
                  >
                    プレミアムプランを見る
                  </a>
                )}
              </div>
            )}

            {/* 入力フォーム */}
            <FortuneForm
              me={data}
              submitting={fortune.isStreaming}
              onSubmit={handleFormSubmit}
            />
          </div>
        )}

        {/* ストリーミング中 or 結果表示 */}
        {(fortune.output || fortune.isStreaming) && (
          <>
            {/* ストリーム開始直後、まだデータがない場合のスケルトン */}
            {fortune.isStreaming && !fortune.output && (
              <div className="space-y-5 animate-fade-in">
                <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-5 space-y-2.5">
                  <div className="skeleton h-3.5 w-full" />
                  <div className="skeleton h-3.5 w-11/12" />
                  <div className="skeleton h-3.5 w-9/12" />
                </div>
                <div className="text-center">
                  <span className="inline-block h-4 w-4 border-2 border-amber-200/40 border-t-amber-400 rounded-full animate-spin" />
                  <p className="text-xs text-amber-200/30 mt-1">
                    星の配置を読んでいます...
                  </p>
                </div>
              </div>
            )}

            {/* パーシャル or 完了結果 */}
            {fortune.output && (
              <FortuneResult
                output={fortune.output}
                isStreaming={fortune.isStreaming}
                onBack={handleBack}
              />
            )}

            {/* ストリーム中のエラー */}
            {fortune.error && !fortune.isStreaming && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 text-center animate-fade-in">
                {fortune.error}
                <button
                  type="button"
                  onClick={handleBack}
                  className="block w-full mt-2 text-amber-400 underline underline-offset-2"
                >
                  もう一度やり直す
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

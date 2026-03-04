"use client";

import { useState } from "react";
import Link from "next/link";
import { ZODIAC_LABELS, type ZodiacKey } from "@/lib/fortune/zodiac";
import DailyResult from "@/components/daily/DailyResult";
import { trackEvent } from "@/lib/trackEvent";
import type { DailyOutput } from "@/lib/ai/dailySchema";

const ZODIAC_ENTRIES = Object.entries(ZODIAC_LABELS) as [ZodiacKey, string][];

function DailySkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="letter-card px-7 py-8 space-y-5">
        <div className="skeleton-letter h-3.5 w-full" />
        <div className="skeleton-letter h-3.5 w-11/12" />
        <div className="skeleton-letter h-3.5 w-9/12" />
        <div className="skeleton-letter h-3.5 w-10/12" />
        <div className="flex justify-center pt-2">
          <div className="skeleton-letter h-5 w-48" />
        </div>
      </div>
    </div>
  );
}

export default function DailyPage() {
  const [selected, setSelected] = useState<ZodiacKey | null>(null);
  const [result, setResult] = useState<DailyOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSelect(key: ZodiacKey) {
    setSelected(key);
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/daily?zodiac=${key}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "unknown" }));
        if (body.error === "rate_limited") {
          setError("しばらく時間をおいてからお試しください。");
        } else {
          setError("取得に失敗しました。もう一度お試しください。");
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setResult(data.output as DailyOutput);
      trackEvent("daily_draw");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-sm mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-1 animate-fade-in-up">
          <Link
            href="/"
            className="text-xs text-amber-200/30 hover:text-amber-200/50 transition-colors"
          >
            &larr; Aira
          </Link>
          <h1 className="text-xl text-amber-100 tracking-wide">
            今日の余白便り
          </h1>
          <p className="text-xs text-amber-200/40">
            星座を選んで、今日のひとことを受け取りましょう
          </p>
        </div>

        {/* 星座ピッカー */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in-up delay-1">
          {ZODIAC_ENTRIES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              disabled={loading}
              className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                selected === key
                  ? "bg-amber-600/80 text-amber-50 shadow-md shadow-amber-900/30"
                  : "bg-amber-200/5 text-amber-200/50 hover:bg-amber-200/10 border border-amber-200/8"
              } disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* スケルトンローディング */}
        {loading && <DailySkeleton />}

        {/* エラー */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* 結果 */}
        {result && selected && !loading && (
          <>
            <DailyResult
              output={result}
              zodiacLabel={ZODIAC_LABELS[selected]}
            />

            {/* ログイン導線 */}
            <div className="pt-2 space-y-3 animate-fade-in-up delay-5">
              <p className="text-xs text-amber-200/40 text-center">
                恋愛・仕事・健康・対人・金運 — 5つの運勢を深く読み解きます
              </p>
              <Link
                href="/login"
                onClick={() => trackEvent("daily_cta_login")}
                className="block w-full py-3 px-6 bg-amber-600 hover:bg-amber-500
                           text-white font-medium rounded-full transition-colors text-center text-sm shadow-md shadow-amber-900/30"
              >
                5つの運勢を詳しく見る
              </Link>
              <p className="text-[10px] text-amber-200/25 text-center">
                Googleで約10秒ではじめられます（無料）
              </p>
            </div>
          </>
        )}

        {/* 免責 */}
        <p className="text-xs text-amber-200/30 text-center pt-4 leading-relaxed">
          この占いは参考情報です。重大な判断は専門家にご相談ください。
        </p>

        {/* フッター */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-amber-200/25">
          <Link href="/privacy" className="hover:text-amber-200/50 transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-amber-200/50 transition-colors">
            利用規約
          </Link>
          <Link href="/commercial" className="hover:text-amber-200/50 transition-colors">
            特定商取引法
          </Link>
        </div>
      </div>
    </main>
  );
}

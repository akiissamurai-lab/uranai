"use client";

import { useState } from "react";
import Link from "next/link";
import { ZODIAC_LABELS, type ZodiacKey } from "@/lib/fortune/zodiac";
import DailyResult from "@/components/daily/DailyResult";
import { trackEvent } from "@/lib/trackEvent";
import type { DailyOutput } from "@/lib/ai/dailySchema";

const ZODIAC_ENTRIES = Object.entries(ZODIAC_LABELS) as [ZodiacKey, string][];

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
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <Link href="/" className="text-xs text-amber-200/40 hover:text-amber-200/60">
            ← Aira
          </Link>
          <h1 className="text-2xl font-bold text-amber-100">
            今日の余白便り
          </h1>
          <p className="text-sm text-amber-200/50">
            星座を選んで、今日のひとことを受け取りましょう
          </p>
        </div>

        {/* 星座ピッカー */}
        <div className="grid grid-cols-4 gap-2">
          {ZODIAC_ENTRIES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              disabled={loading}
              className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                selected === key
                  ? "bg-amber-600/80 text-amber-50"
                  : "bg-amber-900/20 text-amber-200/50 hover:bg-amber-900/30"
              } disabled:opacity-40`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ローディング */}
        {loading && (
          <div className="text-center py-8">
            <span className="inline-block h-5 w-5 border-2 border-amber-200/40 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-xs text-amber-200/40 mt-2">
              あなたへの手紙を書いています...
            </p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300 text-center">
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
            <div className="pt-4 space-y-3">
              <p className="text-xs text-amber-200/50 text-center">
                恋愛・仕事・健康・対人・金運 — 5つの運勢を深く読み解きます
              </p>
              <Link
                href="/login"
                onClick={() => trackEvent("daily_cta_login")}
                className="block w-full py-3 px-6 bg-amber-600 hover:bg-amber-500
                           text-white font-medium rounded-xl transition-colors text-center"
              >
                もっと詳しく相談する →
              </Link>
              <p className="text-xs text-amber-200/40 text-center">
                ログインして、5つの運勢を詳しく鑑定できます
              </p>
              <p className="text-[10px] text-amber-200/30 text-center">
                ※Googleで約10秒ではじめられます（無料）
              </p>
            </div>
          </>
        )}

        {/* 免責 */}
        <p className="text-[10px] text-amber-200/20 text-center pt-4">
          この占いは参考情報です。重大な判断は専門家にご相談ください。
        </p>

        {/* フッター */}
        <div className="flex flex-wrap gap-4 justify-center text-xs text-amber-200/30">
          <Link href="/privacy" className="hover:text-amber-200/60">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-amber-200/60">
            利用規約
          </Link>
          <Link href="/commercial" className="hover:text-amber-200/60">
            特定商取引法
          </Link>
        </div>
      </div>
    </main>
  );
}

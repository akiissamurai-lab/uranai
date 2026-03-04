"use client";

import { useState, useEffect } from "react";
import { ZODIAC_LABELS, type ZodiacKey } from "@/lib/fortune/zodiac";
import DailyResult from "./DailyResult";
import type { DailyOutput } from "@/lib/ai/dailySchema";

const ZODIAC_ENTRIES = Object.entries(ZODIAC_LABELS) as [ZodiacKey, string][];

interface DailyCardProps {
  /** ログインユーザーの星座（birthdateから算出済み）。未設定ならnull */
  initialZodiac: ZodiacKey | null;
}

export default function DailyCard({ initialZodiac }: DailyCardProps) {
  const [selected, setSelected] = useState<ZodiacKey | null>(initialZodiac);
  const [result, setResult] = useState<DailyOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function fetchDaily(zodiac: ZodiacKey) {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily?zodiac=${zodiac}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data.output as DailyOutput);
        setExpanded(true);
      }
    } catch {
      // silently fail — DailyCard is non-critical
    } finally {
      setLoading(false);
    }
  }

  // 初期星座が設定されていれば自動フェッチ
  useEffect(() => {
    if (initialZodiac) {
      fetchDaily(initialZodiac);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialZodiac]);

  function handleSelect(key: ZodiacKey) {
    setSelected(key);
    fetchDaily(key);
  }

  return (
    <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl overflow-hidden">
      {/* ヘッダー（常に表示） */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-amber-200/70">
          今日の余白便り
        </span>
        <span className="text-xs text-amber-200/30">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* 展開エリア */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in">
          {/* 星座未選択 → ピッカー表示 */}
          {!selected && (
            <>
              <p className="text-xs text-amber-200/40">
                星座を選んでください
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {ZODIAC_ENTRIES.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelect(key)}
                    disabled={loading}
                    className="py-1.5 rounded-lg text-[10px] font-medium transition-all
                      bg-amber-900/20 text-amber-200/50 hover:bg-amber-900/30
                      disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ローディング */}
          {loading && (
            <div className="text-center py-4">
              <span className="inline-block h-4 w-4 border-2 border-amber-200/40 border-t-amber-400 rounded-full animate-spin" />
            </div>
          )}

          {/* 結果 */}
          {result && selected && !loading && (
            <>
              <DailyResult
                output={result}
                zodiacLabel={ZODIAC_LABELS[selected]}
              />
              {/* 星座変更ボタン */}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setResult(null);
                }}
                className="text-[10px] text-amber-200/30 hover:text-amber-200/50"
              >
                別の星座で見る
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

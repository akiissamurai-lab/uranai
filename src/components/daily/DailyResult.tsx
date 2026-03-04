"use client";

import type { DailyOutput } from "@/lib/ai/dailySchema";

interface DailyResultProps {
  output: DailyOutput;
  zodiacLabel: string;
}

export default function DailyResult({ output, zodiacLabel }: DailyResultProps) {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  });

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* 星座ラベル */}
      <p className="text-center text-xs text-amber-200/50">
        {zodiacLabel}のあなたへ
      </p>

      {/* 手紙カード */}
      <div className="letter-card px-7 py-8 space-y-6">
        {/* メッセージ本文 */}
        <p className="letter-text text-sm whitespace-pre-wrap">
          {output.message}
        </p>

        {/* ひとこと */}
        <p
          className="letter-text text-base font-medium text-center"
          style={{ color: "#2c1e10" }}
        >
          {output.one_line}
        </p>

        {/* 区切り */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: "rgba(120, 80, 40, 0.12)" }}
          />
          <span className="text-xs" style={{ color: "rgba(120, 80, 40, 0.3)" }}>
            ✦
          </span>
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: "rgba(120, 80, 40, 0.12)" }}
          />
        </div>

        {/* 今日の小さな一歩 */}
        <div className="space-y-1">
          <p className="text-[10px] font-medium" style={{ color: "#9b7e5e" }}>
            今日の小さな一歩
          </p>
          <p className="letter-text text-sm">{output.action}</p>
        </div>

        {/* ラッキー */}
        <div className="flex gap-6 justify-center">
          <div className="text-center space-y-0.5">
            <p className="text-[10px]" style={{ color: "#9b7e5e" }}>
              ラッキーカラー
            </p>
            <p className="text-sm" style={{ color: "#3d2c1e" }}>
              {output.lucky_color}
            </p>
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-[10px]" style={{ color: "#9b7e5e" }}>
              ラッキーアイテム
            </p>
            <p className="text-sm" style={{ color: "#3d2c1e" }}>
              {output.lucky_item}
            </p>
          </div>
        </div>

        {/* 署名 */}
        <div className="text-center pt-2">
          <p className="letter-text text-xs" style={{ color: "#9b7e5e" }}>
            （アイラ）
          </p>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: "rgba(120, 80, 40, 0.3)" }}
          >
            {today}
          </p>
        </div>
      </div>
    </div>
  );
}

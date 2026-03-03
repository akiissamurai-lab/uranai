"use client";

import type { DailyOutput } from "@/lib/ai/dailySchema";

interface DailyResultProps {
  output: DailyOutput;
  zodiacLabel: string;
}

export default function DailyResult({ output, zodiacLabel }: DailyResultProps) {
  return (
    <div className="space-y-4">
      {/* 星座ラベル */}
      <p className="text-center text-xs text-amber-200/50">
        {zodiacLabel}のあなたへ
      </p>

      {/* メッセージ（手紙風） */}
      <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-5">
        <p className="text-sm text-amber-200/80 leading-relaxed whitespace-pre-wrap">
          {output.message}
        </p>
      </div>

      {/* ひとこと */}
      <div className="text-center">
        <p className="text-lg font-bold text-amber-100">
          {output.one_line}
        </p>
      </div>

      {/* 今日の小さな一歩 */}
      <div className="bg-amber-600/10 border border-amber-600/20 rounded-xl p-4 space-y-1">
        <p className="text-xs text-amber-300/60 font-medium">
          今日の小さな一歩
        </p>
        <p className="text-sm text-amber-100">{output.action}</p>
      </div>

      {/* ラッキー */}
      <div className="flex gap-4 justify-center">
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-amber-200/40">ラッキーカラー</p>
          <p className="text-sm text-amber-200/80">{output.lucky_color}</p>
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-[10px] text-amber-200/40">ラッキーアイテム</p>
          <p className="text-sm text-amber-200/80">{output.lucky_item}</p>
        </div>
      </div>
    </div>
  );
}

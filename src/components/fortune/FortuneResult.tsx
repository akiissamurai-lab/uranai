"use client";

import type { FortuneOutput, FortuneSection } from "@/lib/ai/schema";

const SECTION_LABELS: Record<string, string> = {
  love: "恋愛運",
  work: "仕事運",
  money: "金運",
  health: "健康運",
  general: "総合運",
};

const SECTION_ICONS: Record<string, string> = {
  love: "♡",
  work: "◆",
  money: "◎",
  health: "✦",
  general: "☆",
};

function ScoreDots({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`inline-block w-2 h-2 rounded-full transition-colors ${
            i < score ? "bg-amber-400" : "bg-amber-900/30"
          }`}
        />
      ))}
    </span>
  );
}

function SectionCard({ section }: { section: Partial<FortuneSection> }) {
  if (!section.key) return null;
  return (
    <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4 space-y-3 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-amber-100">
          {SECTION_ICONS[section.key] ?? "☆"}{" "}
          {SECTION_LABELS[section.key] ?? section.key}
        </h3>
        {section.score != null && <ScoreDots score={section.score} />}
      </div>

      {section.headline && (
        <p className="text-sm text-amber-200/70 font-medium">
          {section.headline}
        </p>
      )}

      {section.text && (
        <p className="text-sm text-amber-200/60 leading-relaxed">
          {section.text}
        </p>
      )}

      {section.do && section.do.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-amber-300/60 font-medium">おすすめ</p>
          <ul className="space-y-0.5">
            {section.do.map((item, i) => (
              <li key={i} className="text-xs text-amber-200/50 pl-3 relative">
                <span className="absolute left-0">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {section.avoid && section.avoid.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-amber-300/60 font-medium">
            気をつけポイント
          </p>
          <ul className="space-y-0.5">
            {section.avoid.map((item, i) => (
              <li key={i} className="text-xs text-amber-200/50 pl-3 relative">
                <span className="absolute left-0">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface FortuneResultProps {
  output: Partial<FortuneOutput>;
  isStreaming?: boolean;
  onBack?: () => void;
}

export default function FortuneResult({
  output,
  isStreaming,
  onBack,
}: FortuneResultProps) {
  return (
    <div className="space-y-5">
      {/* イントロ */}
      {output.intro != null && (
        <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-5 animate-fade-in-up">
          <p className="text-sm text-amber-200/80 leading-relaxed whitespace-pre-wrap">
            {output.intro}
          </p>
        </div>
      )}

      {/* サマリー */}
      {output.summary != null && (
        <div className="text-center space-y-2 animate-fade-in-up">
          {output.summary.title && (
            <h2 className="text-lg font-bold text-amber-100">
              {output.summary.title}
            </h2>
          )}
          {output.summary.overall_score != null && (
            <div className="inline-flex items-center gap-2 bg-amber-600/20 rounded-full px-4 py-1.5">
              <span className="text-2xl font-bold text-amber-300">
                {output.summary.overall_score}
              </span>
              <span className="text-xs text-amber-200/50">/ 100</span>
            </div>
          )}
          {output.summary.one_line && (
            <p className="text-sm text-amber-200/70">
              {output.summary.one_line}
            </p>
          )}
          {output.summary.week_one_line && (
            <p className="text-xs text-amber-200/40">
              今週: {output.summary.week_one_line}
            </p>
          )}
        </div>
      )}

      {/* セクション（リアルタイム表示） */}
      {output.sections && output.sections.length > 0 && (
        <div className="space-y-3">
          {output.sections.map(
            (section, i) =>
              section && (
                <SectionCard
                  key={
                    (section as Partial<FortuneSection>).key ?? `section-${i}`
                  }
                  section={section as Partial<FortuneSection>}
                />
              ),
          )}
        </div>
      )}

      {/* 今日のアクション */}
      {output.today_action != null && (
        <div className="bg-amber-600/10 border border-amber-600/20 rounded-xl p-4 space-y-2 animate-fade-in-up">
          <h3 className="text-sm font-bold text-amber-200">
            今日のアクション
          </h3>
          {output.today_action.action && (
            <p className="text-sm text-amber-100">
              {output.today_action.action}
            </p>
          )}
          {output.today_action.why && (
            <p className="text-xs text-amber-200/50">
              {output.today_action.why}
            </p>
          )}
        </div>
      )}

      {/* ラッキー */}
      {output.lucky != null && (
        <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-4 animate-fade-in-up">
          <h3 className="text-sm font-bold text-amber-200 mb-3">
            ラッキーアイテム
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "カラー", value: output.lucky.color },
              { label: "アイテム", value: output.lucky.item },
              { label: "場所", value: output.lucky.place },
              { label: "時間帯", value: output.lucky.time },
            ].map(
              ({ label, value }) =>
                value && (
                  <div key={label} className="space-y-0.5">
                    <p className="text-xs text-amber-200/40">{label}</p>
                    <p className="text-sm text-amber-200/80">{value}</p>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* 免責 */}
      {output.disclaimer && (
        <p className="text-xs text-amber-200/50 text-center leading-relaxed animate-fade-in">
          {output.disclaimer}
        </p>
      )}

      {/* ストリーム中インジケーター */}
      {isStreaming && (
        <div className="text-center py-2 animate-fade-in">
          <span className="inline-block h-4 w-4 border-2 border-amber-200/40 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs text-amber-200/30 mt-1">
            鑑定を書き進めています...
          </p>
        </div>
      )}

      {/* 戻るボタン（ストリーム完了後のみ） */}
      {!isStreaming && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 rounded-full font-bold text-sm transition-all
            bg-amber-900/20 text-amber-200/60 hover:bg-amber-900/30 hover:text-amber-200
            animate-fade-in-up"
        >
          &larr; もう一度占う
        </button>
      )}
    </div>
  );
}

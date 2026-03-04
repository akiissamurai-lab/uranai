import type { Metadata } from "next";
import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "寝る前に、心をほどく小さな習慣｜Aira 余白便り",
  description:
    "眠れない夜、不安が止まらない夜に。1分でできる小さなセルフケアと、今日のあなたに届く短い手紙。答えじゃなく、余白がほしい夜に。",
  alternates: { canonical: "/night-care" },
  openGraph: {
    title: "寝る前に、心をほどく小さな習慣｜Aira 余白便り",
    description:
      "眠れない夜、不安が止まらない夜に。1分でできる小さなセルフケアと、今日のあなたに届く短い手紙。",
    url: "/night-care",
  },
};

export default function NightCarePage() {
  return (
    <main className="min-h-screen px-3 py-6 md:px-6 md:py-12">
      <div className="max-w-[calc(100vw-1.5rem)] md:max-w-lg mx-auto space-y-6 md:space-y-10">
        {/* ── ヘッダー ── */}
        <div className="text-center space-y-2 animate-fade-in-up">
          <Link
            href="/"
            className="text-xs text-amber-200/30 hover:text-amber-200/50 transition-colors"
          >
            &larr; トップへ
          </Link>
          <h1 className="text-lg md:text-xl text-amber-100 tracking-wide leading-relaxed">
            寝る前に、
            <br className="md:hidden" />
            心をほどくための小さな習慣
          </h1>
          <p className="text-sm text-amber-200/50">
            1分でできることから。
          </p>
        </div>

        {/* ── 便箋カード本体 ── */}
        <div className="letter-card px-5 py-6 md:px-8 md:py-10 space-y-8 md:space-y-10 animate-fade-in-up delay-1">
          {/* § 眠れない夜に起きていること */}
          <section className="space-y-4">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              眠れない夜に起きていること
            </h2>
            <ul
              className="letter-text text-sm space-y-1.5"
              style={{ color: "#6b5744" }}
            >
              <li>頭のなかが、ぐるぐる止まらない</li>
              <li>明日のことが、なぜか不安になる</li>
              <li>今日の自分を、責めてしまう</li>
              <li>誰かに話したいけど、こんな時間に連絡できない</li>
            </ul>
            <p
              className="letter-text text-sm"
              style={{ color: "#9b7e5e" }}
            >
              どれも、おかしなことではありません。
              <br />
              夜は、心が敏感になる時間です。
            </p>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § 今夜できる"1分" */}
          <section className="space-y-5">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              今夜できる「1分」
            </h2>

            <div className="space-y-4">
              <StepItem
                number="1"
                title="呼吸する"
                description="4秒吸って、7秒止めて、8秒吐く。1回だけでいい。体が「夜」に切り替わる合図になります。"
              />
              <StepItem
                number="2"
                title="1行だけ書く"
                description="「今日いちばん疲れたこと」を、頭の中から外に出す。ノートでも、スマホのメモでも。書いたら閉じるだけ。"
              />
              <StepItem
                number="3"
                title="短い言葉を読む"
                description="自分のために選ばれた、やさしい一文を読む。答えではなく、余白をもらう。"
              />
            </div>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § 読むための一通 */}
          <section className="space-y-3 text-center">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              読むための一通
            </h2>
            <p
              className="letter-text text-sm"
              style={{ color: "#6b5744" }}
            >
              星座を選ぶだけ。
              <br />
              今日のあなたに、小さな手紙が届きます。
            </p>
            <div className="pt-1">
              <TrackedLink
                href="/daily"
                event="nightcare_cta_daily"
                className="block w-full py-3 px-6 bg-amber-600 hover:bg-amber-500
                           text-white font-medium rounded-full transition-colors text-center text-sm shadow-md"
              >
                今日の余白便りを開く
              </TrackedLink>
            </div>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § 相談したい夜は */}
          <section className="space-y-3 text-center">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              相談したい夜は
            </h2>
            <p
              className="letter-text text-sm"
              style={{ color: "#6b5744" }}
            >
              恋愛・仕事・健康・対人・金運 — もう少し深く聞いてみたいときは。
            </p>
            <Link
              href="/login"
              className="inline-block text-sm transition-colors"
              style={{ color: "#9b7e5e" }}
            >
              ログインして相談する →
            </Link>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § 注意 */}
          <section className="space-y-2">
            <h2
              className="text-xs font-medium"
              style={{ color: "#9b7e5e" }}
            >
              大切なお知らせ
            </h2>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "#9b7e5e" }}
            >
              つらさが強いときは、ひとりで抱え込まないでください。
              いのちの電話（0120-783-556）やよりそいホットライン（0120-279-338）に相談できます。
              Airaは医療の専門家ではありません。
            </p>
          </section>
        </div>

        {/* ── Airaについて ── */}
        <div className="text-center animate-fade-in delay-3">
          <Link
            href="/about"
            className="text-xs text-amber-200/40 hover:text-amber-200/60 transition-colors underline underline-offset-4 decoration-amber-200/20"
          >
            Airaについて詳しく
          </Link>
        </div>

        {/* ── フッター ── */}
        <div className="flex flex-wrap gap-3 md:gap-4 justify-center text-[10px] md:text-xs text-amber-200/25 animate-fade-in delay-4">
          <Link
            href="/privacy"
            className="hover:text-amber-200/50 transition-colors"
          >
            プライバシーポリシー
          </Link>
          <Link
            href="/terms"
            className="hover:text-amber-200/50 transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="/commercial"
            className="hover:text-amber-200/50 transition-colors"
          >
            特定商取引法
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ── 小コンポーネント ── */

function Divider() {
  return (
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
  );
}

function StepItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
        style={{ backgroundColor: "rgba(120, 80, 40, 0.08)", color: "#9b7e5e" }}
      >
        {number}
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium" style={{ color: "#3d2c1e" }}>
          {title}
        </p>
        <p className="letter-text text-sm" style={{ color: "#6b5744" }}>
          {description}
        </p>
      </div>
    </div>
  );
}

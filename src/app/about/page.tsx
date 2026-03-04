import type { Metadata } from "next";
import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";

export const metadata: Metadata = {
  title: "Airaとは｜余白便り — 寝る前に、心がほどける一通",
  description:
    "Airaは、寝る前にひとりで読む『短い手紙』のような占いサービスです。断定しない、怖がらせない、余白を残す。星座を選ぶだけで、今日のあなたに小さな手紙が届きます。",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Airaとは｜余白便り — 寝る前に、心がほどける一通",
    description:
      "星座を選ぶだけ。毎日届く、やさしい手紙。断定しない、怖がらせない、余白を残す。",
    url: "/about",
  },
};

export default function AboutPage() {
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
          <h1 className="text-lg md:text-xl text-amber-100 tracking-wide">
            Aira｜余白便り
          </h1>
          <p className="text-sm md:text-base text-amber-200/60 leading-relaxed">
            寝る前に、心がほどける一通。
          </p>
        </div>

        {/* ── 便箋カード本体 ── */}
        <div className="letter-card px-5 py-6 md:px-8 md:py-10 space-y-8 md:space-y-10 animate-fade-in-up delay-1">
          {/* § できること */}
          <section className="space-y-4">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              できること
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: "#3d2c1e" }}>
                  今日の余白便り
                </p>
                <p
                  className="letter-text text-sm"
                  style={{ color: "#6b5744" }}
                >
                  星座を選ぶだけ。ログイン不要で、今日のあなたに小さな手紙が届きます。
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium" style={{ color: "#3d2c1e" }}>
                  相談する
                </p>
                <p
                  className="letter-text text-sm"
                  style={{ color: "#6b5744" }}
                >
                  恋愛・仕事・健康・対人・金運 — 5つの運勢を深く読み解きます。ログイン後に利用できます。
                </p>
              </div>
            </div>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § 大切にしていること */}
          <section className="space-y-4">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              Airaが大切にしていること
            </h2>
            <ul className="space-y-3">
              <ValueItem
                title="断定しない"
                description="「必ずこうなる」とは言いません。可能性と選択肢をそっと添えるだけ。"
              />
              <ValueItem
                title="怖がらせない"
                description="不安を煽る言葉は使いません。読んだあとに、少しだけ軽くなれるように。"
              />
              <ValueItem
                title="余白を残す"
                description="答えを押しつけません。考える余白、感じる余白を大切にしています。"
              />
            </ul>
            <p className="pt-1">
              <Link
                href="/night-care"
                className="text-sm transition-colors underline underline-offset-4"
                style={{ color: "#9b7e5e", textDecorationColor: "rgba(120, 80, 40, 0.2)" }}
              >
                寝る前の小さな習慣について →
              </Link>
            </p>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § 安全のために */}
          <section className="space-y-3">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              安全のために
            </h2>
            <div
              className="letter-text text-sm space-y-2"
              style={{ color: "#6b5744" }}
            >
              <p>
                Airaは医療・法律・金融の専門家ではありません。重大な判断は必ず専門家にご相談ください。
              </p>
              <p>
                つらさが強いときは、いのちの電話（0120-783-556）やよりそいホットライン（0120-279-338）へ。
                Airaは深刻な状態を検知した場合、占い結果の代わりに支援窓口をご案内します。
              </p>
            </div>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § よくある質問 */}
          <section className="space-y-4">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              よくある質問
            </h2>
            <dl className="space-y-3 text-sm">
              <FaqItem
                q="無料で使えますか？"
                a="今日の余白便りは、ログイン不要・完全無料です。詳しい相談は、ログイン後に1日3回まで無料で利用できます。"
              />
              <FaqItem
                q="なぜログインが必要ですか？"
                a="詳しい占いでは、生年月日などの個人情報をお預かりするため、アカウントで安全に管理しています。"
              />
              <FaqItem
                q="データはどう扱われますか？"
                a="占いの生成にのみ使用します。第三者への提供は原則行いません。詳しくはプライバシーポリシーをご覧ください。"
              />
            </dl>
          </section>

          {/* 区切り */}
          <Divider />

          {/* § はじめる */}
          <section className="space-y-4 text-center">
            <h2
              className="text-base font-medium tracking-wide"
              style={{ color: "#2c1e10" }}
            >
              はじめる
            </h2>
            <div className="space-y-3">
              <TrackedLink
                href="/daily"
                event="about_cta_daily"
                className="block w-full py-3 px-6 bg-amber-600 hover:bg-amber-500
                           text-white font-medium rounded-full transition-colors text-center text-sm shadow-md"
              >
                今日の余白便りを開く
              </TrackedLink>
              <Link
                href="/login"
                className="block text-sm transition-colors"
                style={{ color: "#9b7e5e" }}
              >
                相談してみる（ログイン）
              </Link>
            </div>
          </section>
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

function ValueItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <li className="space-y-0.5">
      <p className="text-sm font-medium" style={{ color: "#3d2c1e" }}>
        {title}
      </p>
      <p className="letter-text text-sm" style={{ color: "#6b5744" }}>
        {description}
      </p>
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="space-y-1">
      <dt className="font-medium" style={{ color: "#3d2c1e" }}>
        {q}
      </dt>
      <dd className="letter-text" style={{ color: "#6b5744" }}>
        {a}
      </dd>
    </div>
  );
}

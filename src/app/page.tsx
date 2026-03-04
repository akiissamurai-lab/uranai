import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";

export default function LPPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-3 py-8 md:px-6 md:py-16">
      {/* 便箋カード: スマホは画面幅いっぱい、PCは余裕のあるサイズ */}
      <div className="letter-card w-full max-w-[calc(100vw-1.5rem)] md:max-w-md px-6 py-8 md:px-10 md:py-12 space-y-6 md:space-y-8 animate-fade-in-up">
        {/* タイトル */}
        <div className="text-center space-y-1">
          <h1
            className="text-xl md:text-2xl tracking-wide"
            style={{ color: "#2c1e10" }}
          >
            Aira<span className="text-sm md:text-base ml-1.5 opacity-50">|</span>
            <span className="text-sm md:text-base ml-1.5 opacity-60">余白便り</span>
          </h1>
        </div>

        {/* キャッチコピー */}
        <div className="text-center">
          <p
            className="letter-text text-base md:text-lg leading-loose"
            style={{ color: "#3d2c1e" }}
          >
            あなたの夜に、
            <br />
            そっと寄り添う、
            <br />
            最初の灯り。
          </p>
        </div>

        {/* 説明文: PCのみ表示。スマホは余白を重視して省略 */}
        <p
          className="hidden md:block text-sm leading-relaxed text-center"
          style={{ color: "#6b5744" }}
        >
          昼間の役目を終えて、心が静まる深夜。
          <br />
          アイラは、あなたのための『余白』を届けます。
          <br />
          誰にも気付かれず、自分に還る場所。
        </p>

        {/* CTA */}
        <TrackedLink
          href="/daily"
          event="lp_cta_daily"
          className="block w-full py-3 md:py-3.5 px-6 bg-amber-600 hover:bg-amber-500
                     text-white font-medium rounded-full transition-colors text-center text-sm shadow-md"
        >
          今日の余白便りを開く
        </TrackedLink>
      </div>

      {/* カード外のフッター */}
      <div className="mt-6 md:mt-10 space-y-3 md:space-y-4 text-center animate-fade-in delay-4">
        <Link
          href="/login"
          className="text-xs md:text-sm text-amber-200/50 hover:text-amber-200/80 transition-colors underline underline-offset-4 decoration-amber-200/20"
        >
          ログインして詳しく占う
        </Link>
        <div className="flex flex-wrap gap-3 md:gap-4 justify-center text-[10px] md:text-xs text-amber-200/25">
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

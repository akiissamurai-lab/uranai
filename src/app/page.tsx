import Link from "next/link";

export default function LPPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-amber-100">
            Aira
          </h1>
          <p className="text-amber-200/60 text-sm">
            あなたの余白に、小さな手紙を届けます。
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/daily"
            className="block w-full py-3 px-6 bg-amber-600 hover:bg-amber-500
                       text-white font-medium rounded-xl transition-colors text-center"
          >
            今日の余白便りを受け取る
          </Link>
          <p className="text-xs text-amber-200/40">
            星座を選ぶだけ。ログイン不要です。
          </p>
          <Link
            href="/login"
            className="block w-full py-2.5 px-6 border border-amber-600/40 hover:border-amber-500/60
                       text-amber-200/70 hover:text-amber-100 font-medium rounded-xl transition-colors text-center text-sm"
          >
            ログインして詳しく占う
          </Link>
        </div>

        <div className="pt-8 flex gap-4 justify-center text-xs text-amber-200/30">
          <Link href="/privacy" className="hover:text-amber-200/60">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-amber-200/60">
            利用規約
          </Link>
        </div>
      </div>
    </main>
  );
}

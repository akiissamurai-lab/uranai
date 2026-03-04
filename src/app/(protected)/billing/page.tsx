"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMe } from "@/lib/hooks/useMe";
import { isBillingEnabled } from "@/lib/billing";
import { CONFIG } from "@/lib/constants";

export default function BillingPage() {
  const billingEnabled = isBillingEnabled();
  const { data, loading, error } = useMe();
  const searchParams = useSearchParams();
  const [actionLoading, setActionLoading] = useState(false);

  const isSuccess = searchParams.get("success") === "1";
  const isCanceled = searchParams.get("canceled") === "1";

  // ── billing OFF → 準備中 ──
  if (!billingEnabled) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-amber-100">プラン・課金</h1>
          <p className="text-amber-200/60 text-sm">準備中です</p>
        </div>
      </main>
    );
  }

  async function handleCheckout() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      } else {
        alert(body.error ?? "エラーが発生しました");
        setActionLoading(false);
      }
    } catch {
      alert("通信エラーが発生しました");
      setActionLoading(false);
    }
  }

  async function handlePortal() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      } else {
        alert(body.error ?? "エラーが発生しました");
        setActionLoading(false);
      }
    } catch {
      alert("通信エラーが発生しました");
      setActionLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-amber-100">プラン・課金</h1>

        {/* 成功/キャンセルバナー */}
        {isSuccess && (
          <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-3 text-sm text-green-300">
            申し込みが完了しました。ありがとうございます！
          </div>
        )}
        {isCanceled && (
          <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-3 text-sm text-amber-300">
            申し込みがキャンセルされました。
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="text-center text-amber-200/40 text-sm animate-pulse">
            読み込み中...
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* プラン状態 */}
            <div className="bg-amber-900/10 border border-amber-800/20 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-200/60">現在のプラン</span>
                <span className="text-sm font-bold text-amber-100">
                  {data.plan === "premium" ? "プレミアム" : "無料"}
                </span>
              </div>

              {data.plan === "premium" && data.subscription && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-200/60">
                      次回更新日
                    </span>
                    <span className="text-sm text-amber-200/80">
                      {new Date(
                        data.subscription.currentPeriodEnd,
                      ).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-200/60">
                      クレジット残
                    </span>
                    <span className="text-sm text-amber-200/80">
                      {data.credits}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* アクションボタン */}
            {data.plan === "free" ? (
              <div className="space-y-3">
                <button
                  onClick={handleCheckout}
                  disabled={actionLoading}
                  className="block w-full py-3 px-6 bg-amber-600 hover:bg-amber-500
                             text-white font-medium rounded-xl transition-colors
                             text-center disabled:opacity-50"
                >
                  {actionLoading
                    ? "処理中..."
                    : `プレミアムに申し込む（月額¥${CONFIG.PRICE_JPY}）`}
                </button>
                <p className="text-xs text-amber-200/40 text-center">
                  毎月{CONFIG.MONTHLY_CREDITS}
                  クレジット付与。いつでも解約できます。
                </p>
              </div>
            ) : (
              <button
                onClick={handlePortal}
                disabled={actionLoading}
                className="block w-full py-3 px-6 border border-amber-600/40
                           hover:border-amber-500/60 text-amber-200/70
                           hover:text-amber-100 font-medium rounded-xl
                           transition-colors text-center text-sm disabled:opacity-50"
              >
                {actionLoading ? "処理中..." : "プランを管理・解約"}
              </button>
            )}
          </div>
        )}

        {/* 注意事項 */}
        <div className="bg-gray-900/50 border border-amber-800/10 rounded-xl p-4 space-y-2">
          <h2 className="text-xs font-bold text-amber-200/60">ご利用にあたって</h2>
          <ul className="text-[11px] text-amber-200/40 space-y-1.5 list-disc list-inside">
            <li>
              プレミアムプランは月額¥{CONFIG.PRICE_JPY.toLocaleString()}
              （税込）の自動更新です。解約しない限り毎月自動的に課金されます。
            </li>
            <li>
              解約は上記「プランを管理・解約」ボタンからStripeカスタマーポータルでいつでも可能です。
              解約後も次回更新日まではプレミアム機能をご利用いただけます。
            </li>
            <li>
              デジタルコンテンツの特性上、お支払い後の返金には原則として応じかねます。
              技術的障害等の場合は個別にご相談ください。
            </li>
            <li>
              毎月{CONFIG.MONTHLY_CREDITS}
              クレジットが付与されます。未使用分は翌月以降も有効ですが、
              解約後は次回更新日を過ぎると失効します。クレジットの換金・返金はできません。
            </li>
          </ul>
          <div className="pt-1 flex gap-3 text-[10px] text-amber-200/30">
            <Link href="/commercial" className="hover:text-amber-200/50 underline">
              特定商取引法に基づく表記
            </Link>
            <Link href="/terms" className="hover:text-amber-200/50 underline">
              利用規約
            </Link>
            <Link href="/privacy" className="hover:text-amber-200/50 underline">
              プライバシーポリシー
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

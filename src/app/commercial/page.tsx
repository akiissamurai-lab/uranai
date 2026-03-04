import Link from "next/link";
import { CONFIG } from "@/lib/constants";

export default function CommercialPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-amber-100 mb-6">
        特定商取引法に基づく表記
      </h1>
      <div className="prose prose-invert prose-amber text-amber-200/80 space-y-4 text-sm">
        <table className="w-full text-left border-collapse">
          <tbody className="divide-y divide-amber-800/20">
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap w-1/3">
                販売事業者
              </th>
              <td className="py-3 text-amber-200/80">永山 暁</td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                所在地
              </th>
              <td className="py-3 text-amber-200/80">
                請求があった場合、遅滞なく開示いたします
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                連絡先
              </th>
              <td className="py-3 text-amber-200/80">
                aira.yohaku@gmail.com
                <br />
                <span className="text-amber-200/40 text-xs">
                  ※お問い合わせはメールにてお願いいたします
                </span>
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                販売価格
              </th>
              <td className="py-3 text-amber-200/80">
                プレミアムプラン: 月額¥{CONFIG.PRICE_JPY.toLocaleString()}（税込）
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                支払方法
              </th>
              <td className="py-3 text-amber-200/80">
                クレジットカード（Stripe決済）
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                支払時期
              </th>
              <td className="py-3 text-amber-200/80">
                申込時に初回決済。以降、毎月同日に自動決済されます。
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                提供時期
              </th>
              <td className="py-3 text-amber-200/80">
                決済完了後、即時ご利用いただけます。
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                自動更新
              </th>
              <td className="py-3 text-amber-200/80">
                解約手続きを行わない限り、毎月自動的に更新・課金されます。
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                解約方法
              </th>
              <td className="py-3 text-amber-200/80">
                マイページの
                <Link
                  href="/billing"
                  className="text-amber-400 hover:text-amber-300 underline"
                >
                  プラン・課金
                </Link>
                ページから「プランを管理・解約」ボタンを押し、Stripeカスタマーポータルで解約できます。
                解約後も、次回更新日までは引き続きプレミアム機能をご利用いただけます。
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                返金ポリシー
              </th>
              <td className="py-3 text-amber-200/80">
                デジタルコンテンツの特性上、お支払い後の返金には原則として応じかねます。
                ただし、技術的障害等によりサービスの提供ができなかった場合は、
                個別にご相談のうえ対応いたします。
              </td>
            </tr>
            <tr>
              <th className="py-3 pr-4 text-amber-100 font-medium align-top whitespace-nowrap">
                クレジットの扱い
              </th>
              <td className="py-3 text-amber-200/80">
                プレミアムプランでは毎月{CONFIG.MONTHLY_CREDITS}
                クレジットが付与されます。未使用クレジットは翌月以降も有効です。
                解約後、残クレジットは次回更新日まで利用可能ですが、
                更新日を過ぎると失効します。クレジットの換金・返金はできません。
              </td>
            </tr>
          </tbody>
        </table>

        <div className="pt-4 flex gap-4 text-xs text-amber-200/30">
          <Link href="/terms" className="hover:text-amber-200/60">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-amber-200/60">
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </main>
  );
}

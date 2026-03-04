import Link from "next/link";
import { CONFIG } from "@/lib/constants";

export default function TermsPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-amber-100 mb-6">利用規約</h1>
      <div className="prose prose-invert prose-amber text-amber-200/80 space-y-4 text-sm">
        <h2 className="text-lg text-amber-100">第1条（サービスの内容）</h2>
        <p>
          本サービスは、AI技術を活用した占い鑑定を提供するWebサービスです。
          鑑定結果はエンターテインメント目的の参考情報であり、
          専門的な助言を代替するものではありません。
        </p>

        <h2 className="text-lg text-amber-100">第2条（免責事項）</h2>
        <ol className="list-decimal list-inside space-y-2 pl-2">
          <li>
            占いの結果に基づく判断・行動はすべてご自身の責任で行ってください。
            健康・法律・投資に関する重大な判断は、必ず専門家にご相談ください。
          </li>
          <li>
            本サービスの結果による損害について、運営者に故意または重過失がある場合を除き、
            運営者は一切の責任を負いません。
          </li>
        </ol>

        <h2 className="text-lg text-amber-100">
          第3条（利用料金・自動更新およびクレジット）
        </h2>
        <ol className="list-decimal list-inside space-y-2 pl-2">
          <li>
            本サービスには、無料プランと有料プラン（月額サブスクリプション）があります。
            <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
              <li>「今日の余白便り」（Daily）：ログイン不要・回数無制限</li>
              <li>「鑑定」（相談）：無料プランは1日{CONFIG.FREE_PER_DAY}回まで</li>
            </ul>
          </li>
          <li>
            有料プランの料金・内容は、サービス内の
            <Link
              href="/billing"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              課金ページ
            </Link>
            および
            <Link
              href="/commercial"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              特定商取引法に基づく表記
            </Link>
            に記載します。有料プランは月額サブスクリプション方式であり、
            ユーザーが所定の解約手続きを行わない限り、
            毎月自動的に更新され、利用料金が請求されます。
          </li>
          <li>
            解約はいつでも可能です。解約手続きはマイページの「プランを管理・解約」から
            Stripeカスタマーポータルで行うことができます。
            解約後も次回更新日までは引き続き有料プランの機能をご利用いただけます。
          </li>
          <li>
            有料プランにて毎月付与されるクレジット（{CONFIG.MONTHLY_CREDITS}
            クレジット）の有効期限は、各クレジットの付与日から180日間とします。
            未使用分は有効期限内であれば翌月以降も利用可能ですが、
            解約手続きを行った場合、次回更新日を過ぎると残クレジットはすべて失効します。
            クレジットの換金・返金はできません。
          </li>
        </ol>

        <h2 className="text-lg text-amber-100">第4条（禁止事項）</h2>
        <p>
          サービスの不正利用、自動化ツールによる大量アクセス、
          他のユーザーへの迷惑行為を禁止します。
        </p>

        <h2 className="text-lg text-amber-100">第5条（規約の変更）</h2>
        <p>
          本規約を変更する場合、運営者は変更後の内容および効力発生日を、
          事前に本サービス内での掲示またはメール等の方法によりユーザーに周知します。
          効力発生日以降にサービスを利用した場合、変更に同意したものとみなします。
        </p>

        <div className="pt-4 flex gap-4 text-xs text-amber-200/30">
          <Link href="/commercial" className="hover:text-amber-200/60">
            特定商取引法に基づく表記
          </Link>
          <Link href="/privacy" className="hover:text-amber-200/60">
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </main>
  );
}

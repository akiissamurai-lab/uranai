export default function TermsPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-amber-100 mb-6">利用規約</h1>
      <div className="prose prose-invert prose-amber text-amber-200/80 space-y-4 text-sm">
        <h2 className="text-lg text-amber-100">1. サービスの内容</h2>
        <p>
          本サービスは、AI技術を活用した占い鑑定を提供するWebサービスです。
          鑑定結果はエンターテインメント目的の参考情報であり、
          専門的な助言を代替するものではありません。
        </p>

        <h2 className="text-lg text-amber-100">2. 免責事項</h2>
        <p>
          占いの結果に基づく判断・行動はすべてご自身の責任で行ってください。
          健康・法律・投資に関する重大な判断は、必ず専門家にご相談ください。
          本サービスの結果によるいかなる損害についても、運営者は責任を負いません。
        </p>

        <h2 className="text-lg text-amber-100">3. 利用料金</h2>
        <p>
          無料プランと有料プラン（月額サブスクリプション）があります。
        </p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>「今日の余白便り」（Daily）：ログイン不要・回数無制限</li>
          <li>「鑑定」（相談）：無料プランは1日3回まで</li>
          <li>有料プランの料金・内容は、サービス内の課金ページに記載します</li>
        </ul>
        <p>
          解約はいつでも可能です。
        </p>

        <h2 className="text-lg text-amber-100">4. 禁止事項</h2>
        <p>
          サービスの不正利用、自動化ツールによる大量アクセス、
          他のユーザーへの迷惑行為を禁止します。
        </p>

        <h2 className="text-lg text-amber-100">5. 規約の変更</h2>
        <p>
          本規約は予告なく変更する場合があります。
          変更後もサービスを利用した場合、変更に同意したものとみなします。
        </p>
      </div>
    </main>
  );
}

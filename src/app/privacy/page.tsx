export default function PrivacyPage() {
  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-amber-100 mb-6">
        プライバシーポリシー
      </h1>
      <div className="prose prose-invert prose-amber text-amber-200/80 space-y-4 text-sm">
        <h2 className="text-lg text-amber-100">1. 収集する情報</h2>
        <p>
          本サービスでは、占い鑑定のためにメールアドレス、生年月日、星座、
          動物占いカテゴリ、悩みカテゴリ、および自由記述テキストを収集します。
        </p>

        <h2 className="text-lg text-amber-100">
          2. 情報の利用目的および第三者提供
        </h2>
        <p>
          収集した情報は、占い鑑定の生成、サービスの改善、およびアカウント管理にのみ使用します。
          原則として第三者への提供は行いません。
          ただし、有料プランの決済処理を目的として、
          決済代行会社（Stripe等）に必要な情報を提供する場合を除きます。
        </p>

        <h2 className="text-lg text-amber-100">3. データの保存</h2>
        <p>
          鑑定結果は履歴機能のためにサーバーに保存されます。
          自由記述テキストは鑑定に必要な最小限の期間のみ保持します。
        </p>

        <h2 className="text-lg text-amber-100">4. データの削除</h2>
        <p>
          アカウント削除をご希望の場合は、お問い合わせください。
          アカウント削除時に関連するすべてのデータを削除します。
        </p>

        <h2 className="text-lg text-amber-100">5. お問い合わせ</h2>
        <p>プライバシーに関するお問い合わせは、サポート窓口までご連絡ください。</p>
      </div>
    </main>
  );
}

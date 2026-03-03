// 履歴詳細ページ（DB読み取り専用、ストリーミングなし）
// T8で実装予定

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-amber-100">鑑定結果</h1>
        <p className="text-amber-200/60 text-sm">ID: {id}</p>
        <p className="text-amber-200/40 text-xs">T8で実装予定</p>
      </div>
    </main>
  );
}

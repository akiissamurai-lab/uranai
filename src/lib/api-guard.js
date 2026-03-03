// ─── API セキュリティガード ─────────────────────────────────────
// CSRF / Origin 検証 + 共通エラーレスポンス

/**
 * Origin ヘッダーを検証し、クロスオリジンの不正リクエストを拒否する。
 * Vercel 環境: NEXT_PUBLIC_SITE_URL または Vercel の自動 URL を許可。
 * 開発環境: localhost を許可。
 * Origin ヘッダーが無い場合（same-origin な <form> POST 等）は許可（ブラウザが保証）。
 */
export function validateOrigin(request) {
  const origin = request.headers.get("origin");

  // Origin ヘッダーなし = same-origin リクエスト（ブラウザは cross-origin POST に必ず Origin を付与する）
  if (!origin) return { valid: true };

  const allowed = getAllowedOrigins();
  if (allowed.has(origin)) return { valid: true };

  return {
    valid: false,
    response: Response.json(
      { error: "不正なリクエスト元です" },
      { status: 403 }
    ),
  };
}

function getAllowedOrigins() {
  const origins = new Set();

  // 本番 URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) origins.add(siteUrl.replace(/\/$/, ""));

  // Vercel の自動 URL（プレビューデプロイ等）
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) origins.add(`https://${vercelUrl}`);

  // Vercel のプロジェクト URL
  const vercelProject = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProject) origins.add(`https://${vercelProject}`);

  // 開発環境
  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Anthropic API エラーを安全なメッセージに変換する。
 * 内部エラー詳細はサーバーログのみに記録し、クライアントには汎用メッセージを返す。
 */
export function safeApiError(status, errBody, context = "AI API") {
  // サーバーログには詳細を記録
  console.error(`${context} error ${status}:`, errBody);

  // クライアントにはステータスに応じた汎用メッセージのみ
  const messages = {
    401: "AI APIの認証に失敗しました。管理者にお問い合わせください。",
    429: "AI APIの利用制限に達しました。しばらく待ってから再度お試しください。",
    500: "AI APIで内部エラーが発生しました。しばらく待ってから再度お試しください。",
    529: "AI APIが混雑しています。しばらく待ってから再度お試しください。",
  };

  return Response.json(
    { error: messages[status] || "AI APIでエラーが発生しました。しばらく待ってから再度お試しください。" },
    { status: 502 }
  );
}

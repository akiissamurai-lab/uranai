/**
 * クライアント用イベントトラッキング（fire-and-forget）。
 * 失敗しても UX に影響しない。keepalive でページ遷移中も送信を保証。
 */
export function trackEvent(event: string) {
  fetch("/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => {});
}

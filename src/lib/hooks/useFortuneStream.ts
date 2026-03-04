"use client";

import { useState, useCallback, useRef } from "react";
import type { FortuneOutput } from "@/lib/ai/schema";
import type { FortuneInput } from "@/lib/validators/fortuneInput";

/** エラーコード → 日本語メッセージ */
const ERROR_MESSAGES: Record<string, string> = {
  daily_limit_reached:
    "本日の占い回数が上限に達しました。明日またお越しください。",
  premium_required: "この機能はプレミアムプランが必要です。",
  rate_limited: "しばらく時間をおいてからお試しください。",
  unauthorized: "ログインが必要です。",
  generation_incomplete:
    "鑑定がうまくいきませんでした。もう一度お試しください（回数は消費されていません）。",
  generation_failed:
    "鑑定中にエラーが発生しました。もう一度お試しください（回数は消費されていません）。",
  internal_server_error:
    "サーバーエラーが発生しました。時間をおいてお試しください。",
};

export interface FortuneStreamResult {
  /** 現在のパーシャル / 完了済みの出力 */
  output: Partial<FortuneOutput> | null;
  /** ストリーム中か */
  isStreaming: boolean;
  /** 完了メタ情報（ストリーム完了 or キャッシュヒット時にセット） */
  meta: { id: string; cached: boolean } | null;
  /** エラーメッセージ（表示用日本語） */
  error: string | null;
  /** エラーコード（premium_required 判定などに使用） */
  errorCode: string | null;
  /** フォームの入力を送信してストリーム開始 */
  submit: (input: FortuneInput) => Promise<void>;
  /** 状態をリセット（もう一度占う） */
  reset: () => void;
}

export function useFortuneStream(): FortuneStreamResult {
  const [output, setOutput] = useState<Partial<FortuneOutput> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [meta, setMeta] = useState<{ id: string; cached: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setOutput(null);
    setIsStreaming(false);
    setMeta(null);
    setError(null);
    setErrorCode(null);
  }, []);

  const submit = useCallback(async (input: FortuneInput) => {
    // 前回のリクエストをキャンセル
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOutput(null);
    setMeta(null);
    setError(null);
    setErrorCode(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/fortune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") ?? "";

      // ── JSON レスポンス（キャッシュ / エラー / 危機対応） ──
      if (contentType.includes("application/json")) {
        const data = await res.json();

        if (!res.ok) {
          const key = data.error ?? "unknown";
          setErrorCode(key);
          setError(
            ERROR_MESSAGES[key] ?? `エラーが発生しました (${res.status})`,
          );
          setIsStreaming(false);
          return;
        }

        // キャッシュヒット or 危機レスポンス
        setOutput(data.output as FortuneOutput);
        setMeta({ id: data.id, cached: data.cached });
        setIsStreaming(false);
        return;
      }

      // ── SSE ストリームレスポンス ──
      if (!res.body) {
        setError("ストリームの読み取りに失敗しました。");
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE イベントを \n\n で分割
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;

          const lines = chunk.split("\n");
          let eventType = "";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            if (line.startsWith("data: ")) data = line.slice(6);
          }

          if (eventType === "done" && data) {
            try {
              const final = JSON.parse(data);
              setOutput(final.output as FortuneOutput);
              setMeta({ id: final.id, cached: final.cached });
            } catch {
              /* ignore parse error */
            }
          } else if (eventType === "error" && data) {
            try {
              const err = JSON.parse(data);
              const key = err.error ?? "generation_failed";
              setErrorCode(key);
              setError(
                ERROR_MESSAGES[key] ?? "鑑定中にエラーが発生しました。",
              );
            } catch {
              setError("鑑定中にエラーが発生しました。");
            }
          } else if (data) {
            // パーシャルオブジェクト更新
            try {
              const partial = JSON.parse(data);
              setOutput(partial as Partial<FortuneOutput>);
            } catch {
              /* ignore partial parse error */
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("通信エラーが発生しました。ネットワークを確認してください。");
    } finally {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
      }
    }
  }, []);

  return { output, isStreaming, meta, error, errorCode, submit, reset };
}

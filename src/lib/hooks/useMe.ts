"use client";

import { useState, useEffect, useCallback } from "react";
import type { MeResponse } from "@/types";

/**
 * /api/me を呼んでユーザー状態を取得するフック。
 * マウント時に1回だけfetchし、結果をstateにキャッシュ。
 * refresh() で明示的に再取得可能。
 */
export function useMe() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        setData(null);
        return;
      }
      const json: MeResponse = await res.json();
      setData(json);
    } catch {
      setError("通信エラー");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return { data, loading, error, refresh: fetchMe };
}

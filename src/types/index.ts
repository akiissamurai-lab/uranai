/**
 * 共通型定義
 */

export interface ApiError {
  error: string;
  retryAfter?: number;
  credits?: number;
}

export interface MeResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  plan: "free" | "premium";
  subscription: {
    status: string;
    currentPeriodEnd: string;
  } | null;
  credits: number;
  todayUsage: {
    dailyKey: string;
    freeCount: number;
    premiumCount: number;
    freeRemaining: number;
    premiumRemaining: number;
  };
}

export interface FortuneHistoryItem {
  id: string;
  mode: string;
  inputJson: Record<string, unknown>;
  summary: {
    title: string;
    overall_score: number;
    one_line: string;
  };
  createdAt: string;
  followUpCount: number;
}

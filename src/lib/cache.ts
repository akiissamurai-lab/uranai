import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { CONFIG } from "./constants";
import { prisma } from "./prisma";

export interface CacheInput {
  birthdate: string;
  zodiac: string;
  animal: string;
  category: string;
  freeText: string;
}

/**
 * freeText の正規化: trim → 連続空白除去 → 先頭N文字
 */
function normalizeFreeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, CONFIG.FREETEXT_HASH_LENGTH);
}

/**
 * JST日付文字列を取得 (UTC+9)
 */
export function getJSTDateString(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/**
 * inputHash を生成。
 * freeTextが空でない場合は正規化して含める（寄り添い体験を維持）。
 */
export function computeInputHash(
  input: CacheInput,
  jstDate: string,
): string {
  let raw = `${input.birthdate}|${input.zodiac}|${input.animal}|${input.category}|${jstDate}`;

  const trimmed = input.freeText?.trim() ?? "";
  if (trimmed.length > 0) {
    raw += `|${normalizeFreeText(trimmed)}`;
  }

  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * キャッシュをバイパスすべきかどうか。
 * premium / followup は常にバイパス（有料の価値 = 毎回新鮮な鑑定）。
 */
export function shouldBypassCache(mode: string): boolean {
  return mode === "premium" || mode === "followup";
}

/**
 * キャッシュヒットを検索。TTL内の同一hashで completed なものがあれば返す。
 */
export async function findCachedResult(inputHash: string) {
  const ttlAgo = new Date(
    Date.now() - CONFIG.CACHE_TTL_HOURS * 60 * 60 * 1000,
  );

  return prisma.fortuneRequest.findFirst({
    where: {
      inputHash,
      status: "completed",
      NOT: { outputJson: { equals: Prisma.DbNull } },
      createdAt: { gte: ttlAgo },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, outputJson: true },
  });
}

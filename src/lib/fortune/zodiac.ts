export type ZodiacKey =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

/** 日本語ラベル */
export const ZODIAC_LABELS: Record<ZodiacKey, string> = {
  aries: "牡羊座",
  taurus: "牡牛座",
  gemini: "双子座",
  cancer: "蟹座",
  leo: "獅子座",
  virgo: "乙女座",
  libra: "天秤座",
  scorpio: "蠍座",
  sagittarius: "射手座",
  capricorn: "山羊座",
  aquarius: "水瓶座",
  pisces: "魚座",
};

/**
 * 星座の開始日テーブル（月, 日, キー）。
 * 日付降順に並べ、最初にマッチした星座を返す。
 */
const ZODIAC_TABLE: [number, number, ZodiacKey][] = [
  [12, 22, "capricorn"],
  [11, 23, "sagittarius"],
  [10, 24, "scorpio"],
  [9, 23, "libra"],
  [8, 23, "virgo"],
  [7, 23, "leo"],
  [6, 22, "cancer"],
  [5, 21, "gemini"],
  [4, 20, "taurus"],
  [3, 21, "aries"],
  [2, 19, "pisces"],
  [1, 20, "aquarius"],
];

/**
 * YYYY-MM-DD → ZodiacKey。
 * 不正入力は例外で落とさず "aries" にフォールバック。
 */
export function getZodiacKey(birthdate: string): ZodiacKey {
  const [, mStr, dStr] = birthdate.split("-");
  const m = Number(mStr);
  const d = Number(dStr);
  if (!Number.isFinite(m) || !Number.isFinite(d)) return "capricorn";
  if (m < 1 || m > 12 || d < 1 || d > 31) return "capricorn";

  for (const [startM, startD, key] of ZODIAC_TABLE) {
    if (m > startM || (m === startM && d >= startD)) {
      return key;
    }
  }
  // 1/1〜1/19 → 山羊座
  return "capricorn";
}

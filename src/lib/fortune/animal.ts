export type AnimalKey =
  | "lion"
  | "cheetah"
  | "pegasus"
  | "elephant"
  | "monkey"
  | "wolf"
  | "koala"
  | "tiger"
  | "blackpanther"
  | "fawn"
  | "racoon"
  | "sheep";

/** 順序固定（インデックス0〜11） */
export const ANIMALS: AnimalKey[] = [
  "lion",
  "cheetah",
  "pegasus",
  "elephant",
  "monkey",
  "wolf",
  "koala",
  "tiger",
  "blackpanther",
  "fawn",
  "racoon",
  "sheep",
];

/** 日本語ラベル */
export const ANIMAL_LABELS: Record<AnimalKey, string> = {
  lion: "ライオン",
  cheetah: "チーター",
  pegasus: "ペガサス",
  elephant: "ゾウ",
  monkey: "サル",
  wolf: "オオカミ",
  koala: "コアラ",
  tiger: "トラ",
  blackpanther: "黒豹",
  fawn: "こじか",
  racoon: "たぬき",
  sheep: "ひつじ",
};

/** 年内の通算日（1月1日=1, 12月31日=365 or 366）— UTC で計算 */
export function dayOfYear(y: number, m: number, d: number): number {
  const jan1 = Date.UTC(y, 0, 1);
  const target = Date.UTC(y, m - 1, d);
  return Math.floor((target - jan1) / 86_400_000) + 1;
}

/**
 * YYYY-MM-DD → AnimalKey（簡易12動物版）
 * index = (dayOfYear - 1) % 12
 * 不正入力は例外で落とさず "koala" にフォールバック
 */
export function getAnimalKey(birthdate: string): AnimalKey {
  const [y, m, d] = birthdate.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return "koala";
  }
  const doy = dayOfYear(y, m, d);
  if (doy < 1 || doy > 366) return "koala";
  const index = (doy - 1) % 12;
  return ANIMALS[index];
}

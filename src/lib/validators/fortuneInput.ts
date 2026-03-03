import { z } from "zod";
import { CONFIG } from "../constants";
import { ZODIAC_LABELS } from "../fortune/zodiac";

// ── 星座 ──
export { ZODIAC_LABELS };

export const ZODIAC_KEYS = Object.keys(ZODIAC_LABELS) as [
  string,
  ...string[],
];

// ── 動物占い ──
export const ANIMAL_LABELS: Record<string, string> = {
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

export const ANIMAL_KEYS = Object.keys(ANIMAL_LABELS) as [
  string,
  ...string[],
];

// ── カテゴリ ──
export const CATEGORY_LABELS: Record<string, string> = {
  love: "恋愛",
  work: "仕事",
  money: "金運",
  health: "健康",
  general: "総合",
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as [
  string,
  ...string[],
];

// ── 性別（任意） ──
export const GENDER_LABELS: Record<string, string> = {
  female: "女性",
  male: "男性",
  nonbinary: "その他",
  not_to_say: "回答しない",
};

export const GENDER_KEYS = Object.keys(GENDER_LABELS) as [
  string,
  ...string[],
];

// ── Zod スキーマ（クライアント / サーバー共用） ──
export const fortuneInputSchema = z.object({
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日を入力してください"),
  zodiac: z.enum(ZODIAC_KEYS, {
    errorMap: () => ({ message: "星座を選択してください" }),
  }),
  animal: z.enum(ANIMAL_KEYS, {
    errorMap: () => ({ message: "動物を選択してください" }),
  }),
  category: z.enum(CATEGORY_KEYS, {
    errorMap: () => ({ message: "テーマを選択してください" }),
  }),
  freeText: z
    .string()
    .max(CONFIG.MAX_FREETEXT_LENGTH, `${CONFIG.MAX_FREETEXT_LENGTH}文字以内`)
    .default(""),
  mode: z.enum(["free", "premium"]),
  gender: z.enum(GENDER_KEYS).optional(),
});

export type FortuneInput = z.infer<typeof fortuneInputSchema>;

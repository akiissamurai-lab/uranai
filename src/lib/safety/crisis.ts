/**
 * 危機キーワード検知。
 * 自傷・自殺・DV・虐待など深刻な危機を示す入力を検出する。
 * 精密な分類は不要。偽陽性(安全な入力を危機と判定)は許容し、
 * 偽陰性(危機入力を見逃す)を最小化する方針。
 */

/** 完全一致に近い短いキーワード */
const EXACT_KEYWORDS = [
  "死にたい",
  "死にたくなる",
  "死んでしまいたい",
  "消えたい",
  "消えてしまいたい",
  "生きていたくない",
  "生きたくない",
  "生きてる意味",
  "自殺",
  "自傷",
  "リストカット",
  "リスカ",
  "首吊り",
  "飛び降り",
  "殺されそう",
  "殺される",
  "虐待",
  "暴力を受けて",
  "暴力を振るわれ",
  "レイプ",
  "性的暴行",
  "監禁",
];

/**
 * 正規表現パターン（表記ゆれ・文脈を拾う）
 * (?:...) でグループ化。hiragana/katakana/kanji 混在を考慮
 */
const REGEX_PATTERNS = [
  /死に\s*たい/,
  /しに\s*たい/,
  /消え\s*たい/,
  /きえ\s*たい/,
  /自[殺さつ]/,
  /じさつ/,
  /DV(?:を|され|被害|から)/i,
  /ドメスティック.?バイオレンス/,
  /手首.?切/,
  /(?:薬|くすり).?(?:大量|たくさん|いっぱい).?(?:飲|の)/,
  /(?:殴|なぐ)られ/,
  /(?:蹴|け)られ/,
  /逃げ(?:られない|場がない|たい)/,
  /(?:助|たす)けて/,
  /もう\s*(?:限界|だめ|ダメ|無理|むり)/,
  /(?:生き|いき)(?:てる|ている)\s*(?:意味|価値)(?:が|も)\s*(?:ない|わからない)/,
];

/**
 * テキストに危機的な内容が含まれるかを判定する。
 * @param text - ユーザーの入力テキスト（freeText, followupText 等を結合したもの）
 * @returns true = 危機検知（占い生成を停止すべき）
 */
export function detectCrisis(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  // 1. 完全一致キーワード検索
  for (const keyword of EXACT_KEYWORDS) {
    if (normalized.includes(keyword)) return true;
  }

  // 2. 正規表現パターン検索
  for (const pattern of REGEX_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }

  return false;
}

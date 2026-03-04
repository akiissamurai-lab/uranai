/**
 * 危機検知時に返す固定レスポンス。
 * FortuneOutput スキーマを満たす形で構築する。
 * LLM を経由しないため、電話番号の誤変換リスクがない。
 */
import type { FortuneOutput } from "@/lib/ai/schema";

const CRISIS_INTRO = `あなたがここに来てくれたこと、ありがとうございます。

いまは占いよりも、あなたの安全がいちばん大切です。
ひとりで抱えなくて大丈夫。あなたの気持ちを受け止めてくれる専門の窓口があります。

危険が迫っているとき、いますぐつらいと感じるときは、迷わず緊急の連絡先に繋がってください。

— アイラ`;

const SECTION_TEXT =
  "いまは無理をしないでください。あなたが安心できる場所で、ゆっくり過ごすことが何より大切です。";

export const CRISIS_RESPONSE: FortuneOutput = {
  intro: CRISIS_INTRO,
  summary: {
    title: "あなたの安全がいちばん大切です",
    overall_score: 50,
    one_line: "まず安全を確保してください",
    week_one_line: "ひとりで抱えず、誰かに話してみて",
  },
  sections: [
    {
      key: "love",
      headline: "あなたは大切な存在です",
      score: 3,
      text: SECTION_TEXT,
      do: ["信頼できる人に気持ちを話してみてください"],
      avoid: [],
    },
    {
      key: "work",
      headline: "休むことも前に進むこと",
      score: 3,
      text: SECTION_TEXT,
      do: ["今日は無理せず、できることだけで十分です"],
      avoid: [],
    },
    {
      key: "money",
      headline: "焦らなくて大丈夫",
      score: 3,
      text: SECTION_TEXT,
      do: ["公的な支援制度について相談窓口に聞いてみてください"],
      avoid: [],
    },
    {
      key: "health",
      headline: "心と体を守ることが最優先",
      score: 3,
      text: SECTION_TEXT,
      do: ["かかりつけ医や相談窓口に連絡してみてください"],
      avoid: [],
    },
    {
      key: "general",
      headline: "あなたはひとりじゃない",
      score: 3,
      text: SECTION_TEXT,
      do: ["下の相談窓口に、いつでも連絡できます"],
      avoid: [],
    },
  ],
  today_action: {
    action: "安全な場所で深呼吸をする",
    why: "まず今この瞬間の安全を確保することが大切です",
  },
  lucky: {
    color: "—",
    item: "—",
    place: "安心できる場所",
    time: "いま",
  },
  disclaimer:
    "緊急時は 110（警察）/ 119（救急）へ。相談窓口:「よりそいホットライン」「いのちの電話」で検索してください。",
};

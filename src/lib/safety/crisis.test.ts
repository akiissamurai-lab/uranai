import { describe, it, expect } from "vitest";
import { detectCrisis } from "./crisis";

describe("detectCrisis", () => {
  // ── 空・通常入力 → false ──
  it("空文字列 → false", () => {
    expect(detectCrisis("")).toBe(false);
  });

  it("通常の相談 → false", () => {
    expect(detectCrisis("仕事がうまくいくか占ってほしい")).toBe(false);
  });

  it("恋愛相談 → false", () => {
    expect(detectCrisis("片思いの彼と付き合えるか知りたいです")).toBe(false);
  });

  it("金運の相談 → false", () => {
    expect(detectCrisis("今月の金運を教えてください")).toBe(false);
  });

  // ── 完全一致キーワード → true ──
  it("「死にたい」→ true", () => {
    expect(detectCrisis("死にたい")).toBe(true);
  });

  it("「消えたい」→ true", () => {
    expect(detectCrisis("消えたい")).toBe(true);
  });

  it("「自殺」→ true", () => {
    expect(detectCrisis("自殺したいです")).toBe(true);
  });

  it("「リストカット」→ true", () => {
    expect(detectCrisis("リストカットがやめられない")).toBe(true);
  });

  it("「虐待」→ true", () => {
    expect(detectCrisis("子供が虐待されている")).toBe(true);
  });

  it("「殺されそう」→ true", () => {
    expect(detectCrisis("殺されそうで怖い")).toBe(true);
  });

  it("「生きてる意味」→ true", () => {
    expect(detectCrisis("生きてる意味がわからない")).toBe(true);
  });

  // ── 正規表現パターン → true ──
  it("ひらがな「しにたい」→ true", () => {
    expect(detectCrisis("もうしにたい")).toBe(true);
  });

  it("DV被害 → true", () => {
    expect(detectCrisis("DV被害を受けています")).toBe(true);
  });

  it("DVされ → true", () => {
    expect(detectCrisis("DVされて逃げられない")).toBe(true);
  });

  it("殴られ → true", () => {
    expect(detectCrisis("毎日殴られています")).toBe(true);
  });

  it("薬の大量摂取 → true", () => {
    expect(detectCrisis("薬を大量に飲んでしまった")).toBe(true);
  });

  it("「もう限界」→ true", () => {
    expect(detectCrisis("もう限界です")).toBe(true);
  });

  it("「もう無理」→ true", () => {
    expect(detectCrisis("もう無理かもしれない")).toBe(true);
  });

  it("「もうだめ」→ true", () => {
    expect(detectCrisis("もうだめです")).toBe(true);
  });

  it("「助けて」→ true", () => {
    expect(detectCrisis("誰か助けて")).toBe(true);
  });

  it("「逃げられない」→ true", () => {
    expect(detectCrisis("逃げられない")).toBe(true);
  });

  it("「きえたい」→ true", () => {
    expect(detectCrisis("きえたい")).toBe(true);
  });

  // ── 文脈混じりの入力 → true ──
  it("長文の中に危機キーワード → true", () => {
    expect(
      detectCrisis("最近仕事もうまくいかないし、恋人にも振られて、もう死にたいです"),
    ).toBe(true);
  });

  it("スペース混じり → true", () => {
    expect(detectCrisis("死に たい")).toBe(true);
  });

  // ── 偽陽性を許容する判定（「助けて」は偽陽性だが安全側に倒す） ──
  it("「助けてほしい」→ true（安全側に倒す）", () => {
    expect(detectCrisis("占いで助けてほしい")).toBe(true);
  });

  // ── null/undefined 相当 ──
  it("空白のみ → false", () => {
    expect(detectCrisis("   ")).toBe(false);
  });
});

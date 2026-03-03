import { describe, it, expect } from "vitest";
import { getAnimalKey, dayOfYear, ANIMALS } from "../../src/lib/fortune/animal";

describe("dayOfYear", () => {
  it("1/1 → 1", () => expect(dayOfYear(2000, 1, 1)).toBe(1));
  it("12/31 平年 → 365", () => expect(dayOfYear(2023, 12, 31)).toBe(365));
  it("12/31 うるう年 → 366", () => expect(dayOfYear(2024, 12, 31)).toBe(366));
  it("2/29 うるう年 → 60", () => expect(dayOfYear(2024, 2, 29)).toBe(60));
  it("3/1 うるう年 → 61", () => expect(dayOfYear(2024, 3, 1)).toBe(61));
  it("3/1 平年 → 60", () => expect(dayOfYear(2023, 3, 1)).toBe(60));
});

describe("getAnimalKey", () => {
  // 純関数性: 同じ入力 → 同じ出力
  it("同一日付は常に同じ結果", () => {
    const a = getAnimalKey("1990-05-15");
    const b = getAnimalKey("1990-05-15");
    expect(a).toBe(b);
  });

  // 全12キーのいずれかが返る
  it("1/1 は有効なキー", () => {
    expect(ANIMALS).toContain(getAnimalKey("2000-01-01"));
  });

  it("12/31 は有効なキー", () => {
    expect(ANIMALS).toContain(getAnimalKey("2000-12-31"));
  });

  it("うるう年 2/29 で落ちない", () => {
    expect(ANIMALS).toContain(getAnimalKey("2024-02-29"));
  });

  // index = (dayOfYear - 1) % 12 に基づく固定サンプル
  it.each([
    ["2000-01-01", 0],   // doy=1, (1-1)%12=0
    ["2000-01-02", 1],   // doy=2, (2-1)%12=1
    ["2000-01-12", 11],  // doy=12, (12-1)%12=11
    ["2000-01-13", 0],   // doy=13, (13-1)%12=0 — 周期
    ["2000-02-01", 7],   // doy=32, (32-1)%12=7
    ["2000-06-15", 10],  // doy=167, (167-1)%12=10
    ["2000-12-31", 5],   // doy=366(うるう), (366-1)%12=5
    ["2023-12-31", 4],   // doy=365(平年), (365-1)%12=4
    ["2024-02-29", 11],  // doy=60, (60-1)%12=11
    ["2024-03-01", 0],   // doy=61, (61-1)%12=0
    ["1990-07-04", 4],   // doy=185, (185-1)%12=4
    ["1985-11-22", 1],   // doy=326, (326-1)%12=1
  ])("%s → ANIMALS[%d]", (birthdate, expectedIndex) => {
    expect(getAnimalKey(birthdate as string)).toBe(ANIMALS[expectedIndex as number]);
  });

  // NaN ガード
  it("不正入力 → koala にフォールバック", () => {
    expect(getAnimalKey("invalid")).toBe("koala");
    expect(getAnimalKey("")).toBe("koala");
  });
});

import { describe, it, expect } from "vitest";
import { getZodiacKey } from "../../src/lib/fortune/zodiac";

describe("getZodiacKey", () => {
  // 純関数性: 同じ入力 → 同じ出力
  it("同一日付は常に同じ結果", () => {
    const a = getZodiacKey("1990-05-15");
    const b = getZodiacKey("1990-05-15");
    expect(a).toBe(b);
  });

  // ── 境界日テスト（各星座の開始日とその前日） ──
  it.each([
    // 山羊座 12/22 - 1/19
    ["2000-12-21", "sagittarius"], // 射手座最終日
    ["2000-12-22", "capricorn"],   // 山羊座開始
    ["2000-01-19", "capricorn"],   // 山羊座最終日
    ["2000-01-01", "capricorn"],   // 年始

    // 水瓶座 1/20 - 2/18
    ["2000-01-20", "aquarius"],    // 水瓶座開始
    ["2000-02-18", "aquarius"],    // 水瓶座最終日

    // 魚座 2/19 - 3/20
    ["2000-02-19", "pisces"],      // 魚座開始
    ["2000-03-20", "pisces"],      // 魚座最終日

    // 牡羊座 3/21 - 4/19
    ["2000-03-21", "aries"],       // 牡羊座開始
    ["2000-04-19", "aries"],       // 牡羊座最終日

    // 牡牛座 4/20 - 5/20
    ["2000-04-20", "taurus"],      // 牡牛座開始
    ["2000-05-20", "taurus"],      // 牡牛座最終日

    // 双子座 5/21 - 6/21
    ["2000-05-21", "gemini"],      // 双子座開始
    ["2000-06-21", "gemini"],      // 双子座最終日

    // 蟹座 6/22 - 7/22
    ["2000-06-22", "cancer"],      // 蟹座開始
    ["2000-07-22", "cancer"],      // 蟹座最終日

    // 獅子座 7/23 - 8/22
    ["2000-07-23", "leo"],         // 獅子座開始
    ["2000-08-22", "leo"],         // 獅子座最終日

    // 乙女座 8/23 - 9/22
    ["2000-08-23", "virgo"],       // 乙女座開始
    ["2000-09-22", "virgo"],       // 乙女座最終日

    // 天秤座 9/23 - 10/23
    ["2000-09-23", "libra"],       // 天秤座開始
    ["2000-10-23", "libra"],       // 天秤座最終日

    // 蠍座 10/24 - 11/22
    ["2000-10-24", "scorpio"],     // 蠍座開始
    ["2000-11-22", "scorpio"],     // 蠍座最終日

    // 射手座 11/23 - 12/21
    ["2000-11-23", "sagittarius"], // 射手座開始
    ["2000-12-21", "sagittarius"], // 射手座最終日

    // 年末
    ["2000-12-31", "capricorn"],   // 年末は山羊座
  ])("%s → %s", (birthdate, expected) => {
    expect(getZodiacKey(birthdate)).toBe(expected);
  });

  // 年による差がないことを確認
  it("年が異なっても同じ月日なら同じ星座", () => {
    expect(getZodiacKey("1985-03-21")).toBe("aries");
    expect(getZodiacKey("2024-03-21")).toBe("aries");
  });

  // うるう年 2/29
  it("うるう年 2/29 → pisces", () => {
    expect(getZodiacKey("2024-02-29")).toBe("pisces");
  });

  // NaN ガード
  it("不正入力 → capricorn にフォールバック", () => {
    expect(getZodiacKey("invalid")).toBe("capricorn");
    expect(getZodiacKey("")).toBe("capricorn");
    expect(getZodiacKey("abcd-ef-gh")).toBe("capricorn");
  });

  // 範囲外ガード
  it("月・日が範囲外 → capricorn にフォールバック", () => {
    expect(getZodiacKey("2000-13-01")).toBe("capricorn");
    expect(getZodiacKey("2000-00-15")).toBe("capricorn");
    expect(getZodiacKey("2000-06-00")).toBe("capricorn");
    expect(getZodiacKey("2000-06-32")).toBe("capricorn");
  });
});

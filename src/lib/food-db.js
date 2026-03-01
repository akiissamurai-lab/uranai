// 食品データベース — 日本食品標準成分表2020年版（八訂）ベース
// serving: 1食あたりの目安量(g/ml), p/f/c: serving あたりの値(g), cal: kcal, price: 円(目安)

export const FOOD_DB = [
  // ── 肉類 ──
  { name: "鶏むね肉（皮なし）", cat: "肉", serving: 100, unit: "g", p: 23.3, f: 1.9, c: 0, cal: 113, price: 80 },
  { name: "鶏むね肉（皮あり）", cat: "肉", serving: 100, unit: "g", p: 21.3, f: 5.9, c: 0, cal: 145, price: 80 },
  { name: "鶏もも肉（皮なし）", cat: "肉", serving: 100, unit: "g", p: 19.0, f: 5.0, c: 0, cal: 127, price: 90 },
  { name: "鶏もも肉（皮あり）", cat: "肉", serving: 100, unit: "g", p: 17.3, f: 14.2, c: 0, cal: 204, price: 90 },
  { name: "ささみ", cat: "肉", serving: 100, unit: "g", p: 24.6, f: 1.1, c: 0, cal: 114, price: 100 },
  { name: "鶏ひき肉", cat: "肉", serving: 100, unit: "g", p: 17.5, f: 12.0, c: 0, cal: 186, price: 90 },
  { name: "豚ロース", cat: "肉", serving: 100, unit: "g", p: 19.3, f: 19.2, c: 0.2, cal: 263, price: 150 },
  { name: "豚もも肉", cat: "肉", serving: 100, unit: "g", p: 20.5, f: 10.2, c: 0.2, cal: 183, price: 130 },
  { name: "豚バラ肉", cat: "肉", serving: 100, unit: "g", p: 14.4, f: 35.4, c: 0.1, cal: 395, price: 150 },
  { name: "豚ひき肉", cat: "肉", serving: 100, unit: "g", p: 17.7, f: 17.2, c: 0, cal: 236, price: 100 },
  { name: "牛もも肉", cat: "肉", serving: 100, unit: "g", p: 21.3, f: 10.7, c: 0.3, cal: 193, price: 250 },
  { name: "牛バラ肉", cat: "肉", serving: 100, unit: "g", p: 14.4, f: 32.9, c: 0.2, cal: 371, price: 300 },
  { name: "牛ひき肉", cat: "肉", serving: 100, unit: "g", p: 17.1, f: 21.1, c: 0.3, cal: 272, price: 150 },
  { name: "合挽き肉", cat: "肉", serving: 100, unit: "g", p: 17.3, f: 19.5, c: 0.1, cal: 254, price: 120 },
  { name: "ベーコン", cat: "肉", serving: 30, unit: "g", p: 3.9, f: 11.8, c: 0.1, cal: 122, price: 50 },
  { name: "ウインナー", cat: "肉", serving: 50, unit: "g", p: 6.6, f: 14.2, c: 1.5, cal: 161, price: 50 },
  { name: "ハム（ロース）", cat: "肉", serving: 30, unit: "g", p: 5.5, f: 4.2, c: 0.6, cal: 62, price: 40 },
  { name: "サラダチキン", cat: "肉", serving: 110, unit: "g", p: 25.3, f: 1.5, c: 1.1, cal: 121, price: 200 },

  // ── 魚介類 ──
  { name: "鮭（サーモン）", cat: "魚", serving: 80, unit: "g", p: 17.8, f: 3.4, c: 0.1, cal: 106, price: 150 },
  { name: "まぐろ赤身", cat: "魚", serving: 80, unit: "g", p: 21.2, f: 0.3, c: 0, cal: 88, price: 200 },
  { name: "さば", cat: "魚", serving: 80, unit: "g", p: 16.5, f: 12.6, c: 0.2, cal: 185, price: 120 },
  { name: "さば缶（水煮）", cat: "魚", serving: 100, unit: "g", p: 20.9, f: 10.7, c: 0.2, cal: 190, price: 150 },
  { name: "ツナ缶（水煮）", cat: "魚", serving: 70, unit: "g", p: 11.6, f: 0.5, c: 0.1, cal: 52, price: 100 },
  { name: "ツナ缶（油漬）", cat: "魚", serving: 70, unit: "g", p: 12.5, f: 14.7, c: 0.1, cal: 186, price: 100 },
  { name: "ほっけ", cat: "魚", serving: 100, unit: "g", p: 17.3, f: 4.4, c: 0.1, cal: 115, price: 150 },
  { name: "えび", cat: "魚", serving: 80, unit: "g", p: 17.1, f: 0.5, c: 0.2, cal: 74, price: 200 },
  { name: "たこ", cat: "魚", serving: 80, unit: "g", p: 13.0, f: 0.5, c: 0.1, cal: 58, price: 200 },
  { name: "いか", cat: "魚", serving: 80, unit: "g", p: 14.4, f: 0.8, c: 0.2, cal: 66, price: 150 },
  { name: "しらす", cat: "魚", serving: 30, unit: "g", p: 7.2, f: 0.6, c: 0, cal: 34, price: 80 },
  { name: "ちくわ", cat: "魚", serving: 30, unit: "g", p: 3.7, f: 0.6, c: 4.1, cal: 36, price: 20 },
  { name: "かにかま", cat: "魚", serving: 30, unit: "g", p: 3.6, f: 0.2, c: 2.7, cal: 27, price: 25 },

  // ── 卵・乳製品 ──
  { name: "卵（1個）", cat: "卵乳", serving: 60, unit: "g", p: 7.4, f: 6.2, c: 0.2, cal: 87, price: 25 },
  { name: "ゆで卵（1個）", cat: "卵乳", serving: 60, unit: "g", p: 7.7, f: 6.0, c: 0.2, cal: 85, price: 25 },
  { name: "牛乳", cat: "卵乳", serving: 200, unit: "ml", p: 6.6, f: 7.6, c: 9.6, cal: 134, price: 40 },
  { name: "低脂肪乳", cat: "卵乳", serving: 200, unit: "ml", p: 7.6, f: 2.0, c: 11.0, cal: 92, price: 40 },
  { name: "ヨーグルト（無糖）", cat: "卵乳", serving: 100, unit: "g", p: 3.6, f: 3.0, c: 4.9, cal: 62, price: 30 },
  { name: "ギリシャヨーグルト", cat: "卵乳", serving: 100, unit: "g", p: 10.0, f: 0.2, c: 4.8, cal: 59, price: 100 },
  { name: "チーズ（スライス1枚）", cat: "卵乳", serving: 18, unit: "g", p: 4.1, f: 4.7, c: 0.2, cal: 60, price: 30 },
  { name: "カッテージチーズ", cat: "卵乳", serving: 50, unit: "g", p: 6.7, f: 2.3, c: 1.0, cal: 53, price: 80 },
  { name: "バター", cat: "卵乳", serving: 10, unit: "g", p: 0.1, f: 8.1, c: 0, cal: 75, price: 20 },

  // ── 穀物・主食 ──
  { name: "白米（1膳）", cat: "穀物", serving: 150, unit: "g", p: 3.8, f: 0.5, c: 55.7, cal: 252, price: 30 },
  { name: "白米（大盛り）", cat: "穀物", serving: 250, unit: "g", p: 6.3, f: 0.8, c: 92.8, cal: 420, price: 50 },
  { name: "玄米（1膳）", cat: "穀物", serving: 150, unit: "g", p: 4.2, f: 1.5, c: 53.4, cal: 248, price: 40 },
  { name: "オートミール", cat: "穀物", serving: 40, unit: "g", p: 5.5, f: 2.3, c: 27.6, cal: 152, price: 40 },
  { name: "食パン（6枚切り1枚）", cat: "穀物", serving: 60, unit: "g", p: 5.3, f: 2.5, c: 28.0, cal: 158, price: 25 },
  { name: "食パン（8枚切り1枚）", cat: "穀物", serving: 45, unit: "g", p: 4.0, f: 1.9, c: 21.0, cal: 119, price: 20 },
  { name: "パスタ（乾麺）", cat: "穀物", serving: 100, unit: "g", p: 12.2, f: 1.8, c: 71.2, cal: 347, price: 30 },
  { name: "うどん（ゆで）", cat: "穀物", serving: 200, unit: "g", p: 5.2, f: 0.8, c: 43.2, cal: 210, price: 30 },
  { name: "そば（ゆで）", cat: "穀物", serving: 200, unit: "g", p: 9.6, f: 1.4, c: 52.0, cal: 264, price: 40 },
  { name: "そうめん（ゆで）", cat: "穀物", serving: 200, unit: "g", p: 7.0, f: 0.8, c: 51.2, cal: 254, price: 30 },
  { name: "餅（1個）", cat: "穀物", serving: 50, unit: "g", p: 2.1, f: 0.4, c: 25.2, cal: 117, price: 30 },
  { name: "グラノーラ", cat: "穀物", serving: 50, unit: "g", p: 3.5, f: 7.5, c: 33.0, cal: 220, price: 60 },

  // ── 豆類・大豆製品 ──
  { name: "豆腐（絹ごし）", cat: "豆", serving: 150, unit: "g", p: 7.4, f: 4.5, c: 2.9, cal: 84, price: 30 },
  { name: "豆腐（木綿）", cat: "豆", serving: 150, unit: "g", p: 10.5, f: 6.8, c: 2.4, cal: 117, price: 30 },
  { name: "納豆（1パック）", cat: "豆", serving: 45, unit: "g", p: 7.4, f: 4.5, c: 5.4, cal: 90, price: 30 },
  { name: "枝豆", cat: "豆", serving: 80, unit: "g", p: 9.2, f: 5.0, c: 6.4, cal: 108, price: 60 },
  { name: "豆乳（無調整）", cat: "豆", serving: 200, unit: "ml", p: 7.2, f: 4.0, c: 5.8, cal: 92, price: 50 },
  { name: "豆乳（調整）", cat: "豆", serving: 200, unit: "ml", p: 6.4, f: 3.6, c: 9.0, cal: 108, price: 50 },
  { name: "厚揚げ", cat: "豆", serving: 100, unit: "g", p: 10.7, f: 11.3, c: 0.9, cal: 150, price: 50 },
  { name: "油揚げ", cat: "豆", serving: 20, unit: "g", p: 3.7, f: 6.7, c: 0.1, cal: 77, price: 15 },

  // ── 野菜 ──
  { name: "ブロッコリー", cat: "野菜", serving: 80, unit: "g", p: 3.5, f: 0.4, c: 4.2, cal: 27, price: 50 },
  { name: "ほうれん草", cat: "野菜", serving: 80, unit: "g", p: 1.8, f: 0.3, c: 2.5, cal: 16, price: 40 },
  { name: "キャベツ", cat: "野菜", serving: 100, unit: "g", p: 1.3, f: 0.2, c: 5.2, cal: 23, price: 20 },
  { name: "レタス", cat: "野菜", serving: 80, unit: "g", p: 0.5, f: 0.1, c: 2.2, cal: 10, price: 30 },
  { name: "トマト（1個）", cat: "野菜", serving: 150, unit: "g", p: 1.1, f: 0.2, c: 7.1, cal: 30, price: 80 },
  { name: "にんじん", cat: "野菜", serving: 80, unit: "g", p: 0.5, f: 0.1, c: 7.3, cal: 29, price: 30 },
  { name: "たまねぎ", cat: "野菜", serving: 100, unit: "g", p: 1.0, f: 0.1, c: 8.4, cal: 33, price: 30 },
  { name: "もやし", cat: "野菜", serving: 100, unit: "g", p: 1.7, f: 0.1, c: 2.6, cal: 14, price: 20 },
  { name: "きのこ（しめじ）", cat: "野菜", serving: 80, unit: "g", p: 2.2, f: 0.5, c: 3.7, cal: 15, price: 50 },
  { name: "アボカド（半分）", cat: "野菜", serving: 70, unit: "g", p: 1.8, f: 13.0, c: 4.4, cal: 131, price: 80 },
  { name: "さつまいも", cat: "野菜", serving: 150, unit: "g", p: 1.8, f: 0.3, c: 47.3, cal: 198, price: 80 },
  { name: "じゃがいも", cat: "野菜", serving: 150, unit: "g", p: 2.4, f: 0.2, c: 26.3, cal: 114, price: 40 },
  { name: "かぼちゃ", cat: "野菜", serving: 100, unit: "g", p: 1.6, f: 0.2, c: 17.1, cal: 78, price: 40 },
  { name: "バナナ（1本）", cat: "野菜", serving: 100, unit: "g", p: 1.1, f: 0.2, c: 22.5, cal: 93, price: 30 },
  { name: "りんご（1個）", cat: "野菜", serving: 200, unit: "g", p: 0.4, f: 0.2, c: 28.2, cal: 108, price: 100 },

  // ── サプリ・プロテイン ──
  { name: "プロテイン（1杯）", cat: "サプリ", serving: 30, unit: "g", p: 21.0, f: 1.5, c: 3.0, cal: 118, price: 60 },
  { name: "プロテインバー", cat: "サプリ", serving: 45, unit: "g", p: 15.0, f: 7.0, c: 15.0, cal: 190, price: 180 },
  { name: "BCAA", cat: "サプリ", serving: 5, unit: "g", p: 5.0, f: 0, c: 0, cal: 20, price: 30 },

  // ── 調味料・油 ──
  { name: "オリーブオイル", cat: "調味料", serving: 10, unit: "ml", p: 0, f: 10.0, c: 0, cal: 92, price: 15 },
  { name: "ごま油", cat: "調味料", serving: 5, unit: "ml", p: 0, f: 5.0, c: 0, cal: 46, price: 8 },
  { name: "マヨネーズ", cat: "調味料", serving: 15, unit: "g", p: 0.2, f: 11.2, c: 0.4, cal: 100, price: 10 },
  { name: "ドレッシング（和風）", cat: "調味料", serving: 15, unit: "ml", p: 0.3, f: 3.8, c: 2.0, cal: 38, price: 15 },
  { name: "はちみつ", cat: "調味料", serving: 20, unit: "g", p: 0, f: 0, c: 16.0, cal: 60, price: 30 },

  // ── 飲料 ──
  { name: "オレンジジュース", cat: "飲料", serving: 200, unit: "ml", p: 1.4, f: 0.2, c: 21.2, cal: 84, price: 50 },
  { name: "コーラ", cat: "飲料", serving: 350, unit: "ml", p: 0, f: 0, c: 39.4, cal: 158, price: 100 },
  { name: "ブラックコーヒー", cat: "飲料", serving: 200, unit: "ml", p: 0.4, f: 0, c: 1.4, cal: 8, price: 30 },
  { name: "カフェラテ", cat: "飲料", serving: 250, unit: "ml", p: 5.0, f: 5.5, c: 8.0, cal: 103, price: 150 },
  { name: "ビール（350ml）", cat: "飲料", serving: 350, unit: "ml", p: 1.1, f: 0, c: 10.9, cal: 140, price: 200 },

  // ── 外食・惣菜・定番メニュー ──
  { name: "おにぎり（鮭）", cat: "外食", serving: 110, unit: "g", p: 5.0, f: 1.5, c: 40.0, cal: 190, price: 130 },
  { name: "おにぎり（ツナマヨ）", cat: "外食", serving: 110, unit: "g", p: 4.5, f: 5.0, c: 38.0, cal: 220, price: 130 },
  { name: "おにぎり（梅）", cat: "外食", serving: 110, unit: "g", p: 3.5, f: 0.8, c: 39.0, cal: 175, price: 110 },
  { name: "サンドイッチ（卵）", cat: "外食", serving: 130, unit: "g", p: 9.0, f: 12.0, c: 24.0, cal: 250, price: 250 },
  { name: "サラダチキン", cat: "外食", serving: 110, unit: "g", p: 25.3, f: 1.5, c: 1.1, cal: 121, price: 200 },
  { name: "鶏むね肉のグリル", cat: "外食", serving: 150, unit: "g", p: 35.0, f: 3.5, c: 1.0, cal: 180, price: 300 },
  { name: "親子丼", cat: "外食", serving: 400, unit: "g", p: 25.0, f: 12.0, c: 80.0, cal: 550, price: 600 },
  { name: "牛丼（並）", cat: "外食", serving: 380, unit: "g", p: 22.0, f: 25.0, c: 85.0, val: 670, price: 500, cal: 670 },
  { name: "カレーライス", cat: "外食", serving: 450, unit: "g", p: 15.0, f: 18.0, c: 95.0, cal: 620, price: 500 },
  { name: "ラーメン（醤油）", cat: "外食", serving: 500, unit: "g", p: 20.0, f: 12.0, c: 70.0, cal: 480, price: 800 },
  { name: "チャーハン", cat: "外食", serving: 300, unit: "g", p: 12.0, f: 15.0, c: 65.0, cal: 450, price: 600 },
  { name: "焼きそば", cat: "外食", serving: 300, unit: "g", p: 10.0, f: 12.0, c: 55.0, cal: 380, price: 400 },
  { name: "味噌汁", cat: "外食", serving: 180, unit: "ml", p: 2.5, f: 1.0, c: 3.5, cal: 30, price: 20 },
  { name: "豚の生姜焼き", cat: "外食", serving: 150, unit: "g", p: 22.0, f: 18.0, c: 8.0, cal: 290, price: 350 },
  { name: "唐揚げ（3個）", cat: "外食", serving: 120, unit: "g", p: 18.0, f: 15.0, c: 10.0, cal: 260, price: 250 },
  { name: "とんかつ", cat: "外食", serving: 150, unit: "g", p: 24.0, f: 22.0, c: 18.0, cal: 370, price: 500 },
  { name: "焼き魚（鮭）", cat: "外食", serving: 80, unit: "g", p: 18.0, f: 4.0, c: 0, cal: 110, price: 200 },
  { name: "サラダ（ドレッシングなし）", cat: "外食", serving: 120, unit: "g", p: 1.5, f: 0.3, c: 5.0, cal: 25, price: 100 },
  { name: "コンビニ弁当（幕の内）", cat: "外食", serving: 400, unit: "g", p: 18.0, f: 20.0, c: 90.0, cal: 650, price: 500 },
  { name: "ハンバーガー", cat: "外食", serving: 200, unit: "g", p: 15.0, f: 13.0, c: 35.0, cal: 320, price: 300 },
  { name: "フライドポテト（M）", cat: "外食", serving: 120, unit: "g", p: 3.5, f: 17.0, c: 40.0, cal: 330, price: 250 },
  { name: "ピザ（1切れ）", cat: "外食", serving: 100, unit: "g", p: 9.0, f: 10.0, c: 28.0, cal: 240, price: 200 },
  { name: "肉まん（1個）", cat: "外食", serving: 100, unit: "g", p: 7.0, f: 8.0, c: 30.0, cal: 220, price: 130 },
  { name: "たまごサンド", cat: "外食", serving: 130, unit: "g", p: 8.5, f: 13.0, c: 22.0, cal: 245, price: 250 },

  // ── 間食・スイーツ ──
  { name: "プリン", cat: "間食", serving: 100, unit: "g", p: 3.5, f: 5.0, c: 14.0, cal: 126, price: 120 },
  { name: "チョコレート", cat: "間食", serving: 25, unit: "g", p: 1.8, f: 8.5, c: 13.0, cal: 140, price: 50 },
  { name: "クッキー（2枚）", cat: "間食", serving: 20, unit: "g", p: 1.0, f: 4.5, c: 12.5, cal: 95, price: 30 },
  { name: "アイスクリーム", cat: "間食", serving: 100, unit: "ml", p: 3.5, f: 8.0, c: 23.0, cal: 180, price: 100 },
  { name: "ポテトチップス", cat: "間食", serving: 30, unit: "g", p: 1.4, f: 10.5, c: 16.0, cal: 166, price: 50 },
  { name: "カステラ（1切れ）", cat: "間食", serving: 50, unit: "g", p: 3.1, f: 2.2, c: 31.5, cal: 160, price: 80 },
  { name: "大福（1個）", cat: "間食", serving: 70, unit: "g", p: 2.8, f: 0.3, c: 36.0, cal: 165, price: 100 },
  { name: "干し芋", cat: "間食", serving: 40, unit: "g", p: 1.3, f: 0.2, c: 28.0, cal: 120, price: 60 },
  { name: "ミックスナッツ", cat: "間食", serving: 25, unit: "g", p: 5.0, f: 13.5, c: 4.5, cal: 155, price: 50 },
  { name: "あんぱん", cat: "間食", serving: 90, unit: "g", p: 5.5, f: 3.5, c: 45.0, cal: 250, price: 130 },
];

// ── エイリアス（別名→正式名マッピング）──
const ALIASES = {
  "ごはん": "白米", "ご飯": "白米", "ライス": "白米", "米": "白米",
  "たまご": "卵", "玉子": "卵", "エッグ": "卵",
  "鶏肉": "鶏", "チキン": "鶏", "とりにく": "鶏", "とり肉": "鶏",
  "豚肉": "豚", "ぶたにく": "豚", "ポーク": "豚",
  "牛肉": "牛", "ぎゅうにく": "牛", "ビーフ": "牛",
  "ひき肉": "ひき肉", "ミンチ": "ひき肉",
  "ヨーグルト": "ヨーグルト", "よーぐると": "ヨーグルト",
  "ぶろっこりー": "ブロッコリー", "ぶろっこり": "ブロッコリー",
  "とうふ": "豆腐", "トーフ": "豆腐",
  "なっとう": "納豆",
  "さけ": "鮭", "シャケ": "鮭",
  "ツナ": "ツナ", "シーチキン": "ツナ",
  "パン": "食パン", "しょくぱん": "食パン",
  "うどん": "うどん", "そば": "そば", "パスタ": "パスタ", "スパゲッティ": "パスタ",
  "もやし": "もやし", "キャベツ": "キャベツ", "きゃべつ": "キャベツ",
  "にく": "肉", "さかな": "魚", "やさい": "野菜",
  "おにぎり": "おにぎり", "おむすび": "おにぎり",
  "からあげ": "唐揚げ", "から揚げ": "唐揚げ",
  "しょうがやき": "生姜焼き", "生姜焼": "生姜焼き",
  "みそしる": "味噌汁", "みそ汁": "味噌汁",
  "プロテイン": "プロテイン", "ぷろていん": "プロテイン",
  "コーヒー": "コーヒー", "珈琲": "コーヒー",
  "ぎゅうにゅう": "牛乳", "ミルク": "牛乳",
};

// カタカナ→ひらがな変換
function toHiragana(str) {
  return str.toLowerCase()
    .replace(/[\u30A1-\u30F6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
}

// 検索用: トークン分割 + エイリアス + ひらがな正規化
export function searchFoods(query) {
  if (!query || query.length < 1) return [];
  const q = toHiragana(query.trim());

  // エイリアス展開: 入力をエイリアスで置換
  let expanded = q;
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (q.includes(toHiragana(alias))) {
      expanded = toHiragana(canonical);
      break;
    }
  }

  // トークン分割: 1文字クエリはそのまま、2文字以上は個別文字でもマッチ
  const results = FOOD_DB.map(f => {
    const name = toHiragana(f.name);
    const cat = toHiragana(f.cat);

    // 完全部分一致（最優先）
    if (name.includes(expanded) || cat.includes(expanded)) return { food: f, score: 3 };
    if (name.includes(q) || cat.includes(q)) return { food: f, score: 3 };

    // 全文字包含マッチ（「鶏肉」→「鶏」と「肉」両方含む）
    if (q.length >= 2) {
      const chars = [...new Set(q)];
      const allMatch = chars.every(ch => name.includes(ch));
      if (allMatch) return { food: f, score: 2 };
    }

    return null;
  }).filter(Boolean);

  // スコア降順 → 最大20件
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20).map(r => r.food);
}

// サービングサイズに応じたPFC計算
export function calcForServing(food, grams) {
  const ratio = grams / food.serving;
  return {
    name: food.name,
    protein: +(food.p * ratio).toFixed(1),
    fat: +(food.f * ratio).toFixed(1),
    carbs: +(food.c * ratio).toFixed(1),
    cal: Math.round(food.cal * ratio),
    price: Math.round(food.price * ratio),
  };
}

-- routine_meals テーブル: ユーザーの定番メニュー（ワンタップ記録用）
-- Supabase ダッシュボードの SQL Editor で実行してください
-- ※ update_updated_at() 関数は body_metrics で作成済み

CREATE TABLE routine_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_name TEXT NOT NULL,
  emoji TEXT DEFAULT '🍱',
  price NUMERIC(8,0),
  protein NUMERIC(6,1),
  fat NUMERIC(6,1),
  carbs NUMERIC(6,1),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at 自動更新トリガー（既存関数を再利用）
CREATE TRIGGER routine_meals_updated_at
  BEFORE UPDATE ON routine_meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS 有効化
ALTER TABLE routine_meals ENABLE ROW LEVEL SECURITY;

-- 本人のみ CRUD 可能
CREATE POLICY "Users can view own routine meals"
  ON routine_meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routine meals"
  ON routine_meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routine meals"
  ON routine_meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own routine meals"
  ON routine_meals FOR DELETE USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX idx_routine_meals_user ON routine_meals(user_id, sort_order);

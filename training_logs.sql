-- training_logs テーブル: トレーニング記録（ライト構造化）
-- Supabase ダッシュボードの SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS training_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  body_parts TEXT[] NOT NULL,           -- ['chest','back','shoulders'] etc.
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  duration_minutes INTEGER CHECK (duration_minutes >= 0 AND duration_minutes <= 600),
  notes TEXT,                           -- 自由記述の種目メモ
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at 自動更新トリガー（既存関数を再利用）
CREATE TRIGGER training_logs_updated_at
  BEFORE UPDATE ON training_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS 有効化
ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;

-- 本人のみ CRUD 可能
CREATE POLICY "Users can view own training_logs"
  ON training_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own training_logs"
  ON training_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own training_logs"
  ON training_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own training_logs"
  ON training_logs FOR DELETE USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX idx_training_logs_user_date ON training_logs(user_id, date);

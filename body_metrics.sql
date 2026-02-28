-- body_metrics テーブル: 日々の体重・体脂肪率を記録
-- Supabase ダッシュボードの SQL Editor で実行してください

CREATE TABLE body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC(5,2),
  body_fat NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER body_metrics_updated_at
  BEFORE UPDATE ON body_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS 有効化
ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;

-- 本人のみ CRUD 可能
CREATE POLICY "Users can view own metrics"
  ON body_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own metrics"
  ON body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own metrics"
  ON body_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own metrics"
  ON body_metrics FOR DELETE USING (auth.uid() = user_id);

-- パフォーマンス用インデックス
CREATE INDEX idx_body_metrics_user_date ON body_metrics(user_id, date);

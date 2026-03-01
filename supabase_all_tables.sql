-- ================================================================
-- ダツデブ 全テーブル作成SQL（Supabase SQL Editor で実行）
-- ================================================================
-- ・IF NOT EXISTS を使用 → 既存テーブルは壊さない
-- ・RLS + 本人のみCRUDポリシー
-- ・全テーブル: profiles, meal_plans, meal_logs, routine_meals, body_metrics, training_logs
-- ================================================================

-- ─── 共通: updated_at 自動更新関数 ────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 1. profiles — ユーザープロフィール・目標設定
-- ================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  weight NUMERIC(5,2),
  height NUMERIC(5,1),
  age INTEGER,
  body_fat NUMERIC(4,1),
  gender TEXT,
  goal TEXT,
  activity TEXT,
  goal_weight NUMERIC(5,2),
  budget INTEGER,
  protein_goal NUMERIC(6,1),
  fat_goal NUMERIC(6,1),
  carbs_goal NUMERIC(6,1),
  calorie_goal INTEGER,
  meal_count INTEGER DEFAULT 3,
  goal_body_fat NUMERIC(4,1),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ================================================================
-- 2. meal_plans — AI食材プラン履歴
-- ================================================================
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget INTEGER,
  protein_target NUMERIC(6,1),
  calorie_target INTEGER,
  total_protein NUMERIC(6,1),
  total_fat NUMERIC(6,1),
  total_carbs NUMERIC(6,1),
  total_cal NUMERIC(8,1),
  total_cost NUMERIC(8,0),
  items JSONB DEFAULT '[]'::jsonb,
  ai_advice TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plans' AND policyname = 'Users can view own meal_plans') THEN
    CREATE POLICY "Users can view own meal_plans" ON meal_plans FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plans' AND policyname = 'Users can insert own meal_plans') THEN
    CREATE POLICY "Users can insert own meal_plans" ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_plans' AND policyname = 'Users can delete own meal_plans') THEN
    CREATE POLICY "Users can delete own meal_plans" ON meal_plans FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id, created_at DESC);

-- ================================================================
-- 3. meal_logs — 日々の食事記録
-- ================================================================
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  meal_name TEXT NOT NULL,
  price NUMERIC(8,0),
  protein NUMERIC(6,1),
  fat NUMERIC(6,1),
  carbs NUMERIC(6,1),
  meal_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_logs' AND policyname = 'Users can view own meal_logs') THEN
    CREATE POLICY "Users can view own meal_logs" ON meal_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_logs' AND policyname = 'Users can insert own meal_logs') THEN
    CREATE POLICY "Users can insert own meal_logs" ON meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'meal_logs' AND policyname = 'Users can delete own meal_logs') THEN
    CREATE POLICY "Users can delete own meal_logs" ON meal_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);

-- ================================================================
-- 4. body_metrics — 体重・体脂肪率記録
-- ================================================================
CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC(5,2),
  body_fat NUMERIC(4,1),
  weight_night NUMERIC(5,2),
  body_fat_night NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

DROP TRIGGER IF EXISTS body_metrics_updated_at ON body_metrics;
CREATE TRIGGER body_metrics_updated_at
  BEFORE UPDATE ON body_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE body_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_metrics' AND policyname = 'Users can view own metrics') THEN
    CREATE POLICY "Users can view own metrics" ON body_metrics FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_metrics' AND policyname = 'Users can insert own metrics') THEN
    CREATE POLICY "Users can insert own metrics" ON body_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_metrics' AND policyname = 'Users can update own metrics') THEN
    CREATE POLICY "Users can update own metrics" ON body_metrics FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'body_metrics' AND policyname = 'Users can delete own metrics') THEN
    CREATE POLICY "Users can delete own metrics" ON body_metrics FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON body_metrics(user_id, date);

-- ================================================================
-- 5. routine_meals — マイルーティン飯
-- ================================================================
CREATE TABLE IF NOT EXISTS routine_meals (
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

DROP TRIGGER IF EXISTS routine_meals_updated_at ON routine_meals;
CREATE TRIGGER routine_meals_updated_at
  BEFORE UPDATE ON routine_meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE routine_meals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_meals' AND policyname = 'Users can view own routine meals') THEN
    CREATE POLICY "Users can view own routine meals" ON routine_meals FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_meals' AND policyname = 'Users can insert own routine meals') THEN
    CREATE POLICY "Users can insert own routine meals" ON routine_meals FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_meals' AND policyname = 'Users can update own routine meals') THEN
    CREATE POLICY "Users can update own routine meals" ON routine_meals FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'routine_meals' AND policyname = 'Users can delete own routine meals') THEN
    CREATE POLICY "Users can delete own routine meals" ON routine_meals FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routine_meals_user ON routine_meals(user_id, sort_order);

-- ================================================================
-- 6. training_logs — トレーニング記録
-- ================================================================
CREATE TABLE IF NOT EXISTS training_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  body_parts TEXT[] NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 5),
  duration_minutes INTEGER CHECK (duration_minutes >= 0 AND duration_minutes <= 600),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP TRIGGER IF EXISTS training_logs_updated_at ON training_logs;
CREATE TRIGGER training_logs_updated_at
  BEFORE UPDATE ON training_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE training_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'Users can view own training_logs') THEN
    CREATE POLICY "Users can view own training_logs" ON training_logs FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'Users can insert own training_logs') THEN
    CREATE POLICY "Users can insert own training_logs" ON training_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'Users can update own training_logs') THEN
    CREATE POLICY "Users can update own training_logs" ON training_logs FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_logs' AND policyname = 'Users can delete own training_logs') THEN
    CREATE POLICY "Users can delete own training_logs" ON training_logs FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_training_logs_user_date ON training_logs(user_id, date);

-- ================================================================
-- 完了！全6テーブルが作成されました
-- 既存テーブルがある場合はスキップされます（データは消えません）
-- ================================================================

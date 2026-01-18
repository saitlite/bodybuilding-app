-- PostgreSQL用のスキーマ作成スクリプト
-- Vercel Postgresで実行してください

-- スキーマバージョン管理テーブル
CREATE TABLE IF NOT EXISTS _schema_version (
  version INTEGER NOT NULL DEFAULT 0
);

-- 初期バージョンを挿入
INSERT INTO _schema_version (version) VALUES (4)
ON CONFLICT DO NOTHING;

-- 食事記録テーブル
CREATE TABLE IF NOT EXISTS food_logs (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  food_name TEXT NOT NULL,
  amount REAL NOT NULL,
  unit TEXT NOT NULL,
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  score INTEGER DEFAULT 0,
  vitamin_a REAL DEFAULT 0,
  vitamin_c REAL DEFAULT 0,
  vitamin_d REAL DEFAULT 0,
  vitamin_e REAL DEFAULT 0,
  vitamin_b1 REAL DEFAULT 0,
  vitamin_b2 REAL DEFAULT 0,
  vitamin_b6 REAL DEFAULT 0,
  vitamin_b12 REAL DEFAULT 0,
  calcium REAL DEFAULT 0,
  iron REAL DEFAULT 0,
  potassium REAL DEFAULT 0,
  magnesium REAL DEFAULT 0,
  zinc REAL DEFAULT 0,
  choline REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日次記録テーブル
CREATE TABLE IF NOT EXISTS daily_records (
  date DATE PRIMARY KEY,
  weight_am REAL,
  weight_pm REAL,
  memo TEXT,
  sleep_hours REAL,
  cardio_minutes REAL
);

-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  lean_body_mass REAL,
  height REAL,
  weight REAL,
  age INTEGER,
  base_calories REAL,
  base_protein REAL,
  base_fat REAL,
  base_carbs REAL,
  basal_metabolic_rate REAL,
  CHECK (id = 1)
);

-- 初期設定レコードを挿入
INSERT INTO user_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- チャットルームテーブル
CREATE TABLE IF NOT EXISTS chat_rooms (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '新しい会話',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- チャットメッセージテーブル
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);
CREATE INDEX IF NOT EXISTS idx_food_logs_created_at ON food_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_updated_at ON chat_rooms(updated_at);

-- 完了メッセージ
SELECT 'PostgreSQL schema initialized successfully!' AS status;

-- チャットルームにAIロールカラムを追加するマイグレーション

ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS ai_role TEXT NOT NULL DEFAULT 'kanade';

-- 既存のレコードにもデフォルト値を設定
UPDATE chat_rooms SET ai_role = 'kanade' WHERE ai_role IS NULL;

import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'database.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    weight_am REAL,
    weight_pm REAL,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS food_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    food_name TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT NOT NULL,
    calories REAL,
    protein REAL,
    fat REAL,
    carbs REAL,
    score INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS food_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,
    calories REAL,
    protein REAL,
    fat REAL,
    carbs REAL,
    score INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    lean_body_mass REAL,
    base_calories REAL,
    base_protein REAL,
    base_fat REAL,
    base_carbs REAL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
  );

  -- メモカラムを既存テーブルに追加（存在しない場合のみ）
  CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER);
  INSERT OR IGNORE INTO _schema_version (version) VALUES (0);
`);

// メモカラム追加マイグレーション
const version = (db.prepare('SELECT version FROM _schema_version').get() as any)?.version || 0;

if (version < 1) {
  try {
    db.prepare('ALTER TABLE daily_records ADD COLUMN memo TEXT').run();
    console.log('✅ メモカラムを追加しました');
  } catch (e: any) {
    // カラムが既に存在する場合はエラーを無視
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  db.prepare('UPDATE _schema_version SET version = 1').run();
}

export default db;
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

// マイグレーション処理
const version = (db.prepare('SELECT version FROM _schema_version').get() as any)?.version || 0;

// v1: メモカラム追加
if (version < 1) {
  try {
    db.prepare('ALTER TABLE daily_records ADD COLUMN memo TEXT').run();
    console.log('✅ メモカラムを追加しました');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  db.prepare('UPDATE _schema_version SET version = 1').run();
}

// v2: ミクロ栄養素カラム追加
if (version < 2) {
  const micronutrients = [
    'vitamin_a',
    'vitamin_c',
    'vitamin_d',
    'vitamin_e',
    'vitamin_b1',
    'vitamin_b2',
    'vitamin_b6',
    'vitamin_b12',
    'calcium',
    'iron',
    'potassium',
    'magnesium',
    'zinc',
    'choline'
  ];

  for (const nutrient of micronutrients) {
    try {
      db.prepare(`ALTER TABLE food_logs ADD COLUMN ${nutrient} REAL`).run();
      db.prepare(`ALTER TABLE food_cache ADD COLUMN ${nutrient} REAL`).run();
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        throw e;
      }
    }
  }
  console.log('✅ ミクロ栄養素カラムを追加しました');
  db.prepare('UPDATE _schema_version SET version = 2').run();
}

// v3: 睡眠時間・有酸素運動時間カラム追加
if (version < 3) {
  try {
    db.prepare('ALTER TABLE daily_records ADD COLUMN sleep_hours REAL').run();
    db.prepare('ALTER TABLE daily_records ADD COLUMN cardio_minutes REAL').run();
    console.log('✅ 睡眠時間・有酸素運動時間カラムを追加しました');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  db.prepare('UPDATE _schema_version SET version = 3').run();
}

// v4: 身長・体重・年齢カラム追加
if (version < 4) {
  try {
    db.prepare('ALTER TABLE user_config ADD COLUMN height REAL').run();
    db.prepare('ALTER TABLE user_config ADD COLUMN weight REAL').run();
    db.prepare('ALTER TABLE user_config ADD COLUMN age INTEGER').run();
    console.log('✅ 身長・体重・年齢カラムを追加しました');
  } catch (e: any) {
    if (!e.message.includes('duplicate column name')) {
      throw e;
    }
  }
  db.prepare('UPDATE _schema_version SET version = 4').run();
}

export default db;
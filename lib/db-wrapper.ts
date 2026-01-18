import { sql } from '@vercel/postgres';
import Database from 'better-sqlite3';
import path from 'path';

// 環境変数でデータベースタイプを判定
const USE_POSTGRES = process.env.POSTGRES_URL ? true : false;

// SQLite初期化
let sqliteDb: Database.Database | null = null;
if (!USE_POSTGRES) {
  try {
    sqliteDb = new Database(path.join(process.cwd(), 'database.sqlite'));
    // マイグレーション実行
    const version = sqliteDb.prepare('SELECT version FROM _schema_version').get() as { version: number } | undefined;
    const currentVersion = version?.version || 0;
    
    // マイグレーション処理は既存のlib/db.tsと同じ
  } catch (error) {
    console.error('SQLite initialization error:', error);
  }
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export const db = {
  // SELECT文の実行
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (USE_POSTGRES) {
      const result = await sqlQuery(sql, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } else {
      if (!sqliteDb) throw new Error('SQLite not initialized');
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...params);
      return {
        rows,
        rowCount: rows.length,
      };
    }
  },

  // INSERT/UPDATE/DELETE文の実行
  async execute(sql: string, params: any[] = []): Promise<{ lastInsertId?: number; changes: number }> {
    if (USE_POSTGRES) {
      const result = await sqlQuery(sql, params);
      return {
        lastInsertId: result.rows[0]?.id,
        changes: result.rowCount || 0,
      };
    } else {
      if (!sqliteDb) throw new Error('SQLite not initialized');
      const stmt = sqliteDb.prepare(sql);
      const info = stmt.run(...params);
      return {
        lastInsertId: Number(info.lastInsertRowid),
        changes: info.changes,
      };
    }
  },

  // 単一行取得
  async get(sql: string, params: any[] = []): Promise<any> {
    if (USE_POSTGRES) {
      const result = await sqlQuery(sql, params);
      return result.rows[0] || null;
    } else {
      if (!sqliteDb) throw new Error('SQLite not initialized');
      const stmt = sqliteDb.prepare(sql);
      return stmt.get(...params) || null;
    }
  },

  // 複数行取得
  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (USE_POSTGRES) {
      const result = await sqlQuery(sql, params);
      return result.rows;
    } else {
      if (!sqliteDb) throw new Error('SQLite not initialized');
      const stmt = sqliteDb.prepare(sql);
      return stmt.all(...params);
    }
  },

  // トランザクション
  async transaction(callback: () => Promise<void>): Promise<void> {
    if (USE_POSTGRES) {
      // PostgreSQLのトランザクション
      await sqlQuery('BEGIN');
      try {
        await callback();
        await sqlQuery('COMMIT');
      } catch (error) {
        await sqlQuery('ROLLBACK');
        throw error;
      }
    } else {
      if (!sqliteDb) throw new Error('SQLite not initialized');
      // SQLiteのトランザクション
      const transaction = sqliteDb.transaction(callback);
      transaction();
    }
  },
};

// PostgreSQL用のクエリ実行（パラメータをプレースホルダーに変換）
async function sqlQuery(query: string, params: any[] = []) {
  // SQLiteの ? をPostgreSQLの $1, $2... に変換
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  
  // Vercel Postgresのクエリ実行
  return await sql.query(pgQuery, params);
}

export default db;

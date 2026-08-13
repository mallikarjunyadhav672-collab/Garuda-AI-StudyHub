import mysql from 'mysql2/promise';
import { env } from '../config/env';
import { ApiError } from '../utils/helpers';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (pool) return pool;
  const config: mysql.PoolOptions = {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    queueLimit: 0,
    timezone: 'Z',
    charset: 'utf8mb4',
  };
  if (env.dbSsl) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    config.ssl = { rejectUnauthorized: false };
  }
  pool = mysql.createPool(config);
  (async () => {
    try {
      const conn = await pool!.getConnection();
      await conn.ping();
      conn.release();
      console.debug('[db.pool] pool created and ping successful');
    } catch (err) {
      console.error('[db.pool] pool ping failed', err);
      throw err;
    }
  })();
  return pool;
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
    .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()')
    .replace(/date\(\s*'now'\s*\)/gi, 'CURDATE()')
    .replace(/ON\s+CONFLICT\s*\(([^)]+)\)\s*DO\s+UPDATE\s+SET\s+/is, 'ON DUPLICATE KEY UPDATE ')
    .replace(/excluded\.([A-Za-z0-9_]+)/g, 'VALUES($1)')
    .replace(/\s*;\s*$/g, '');
}

class PoolStatement {
  constructor(private readonly sql: string) {}

  async get(...params: any[]) {
    const p = getPool();
    const sql = normalizeSql(this.sql);
    const [rows] = await p.query(sql, params.flat());
    return Array.isArray(rows) && (rows as any[]).length > 0 ? (rows as any[])[0] : undefined;
  }

  async all(...params: any[]) {
    const p = getPool();
    const sql = normalizeSql(this.sql);
    const [rows] = await p.query(sql, params.flat());
    return rows as any[];
  }

  async run(...params: any[]) {
    const p = getPool();
    const sql = normalizeSql(this.sql);
    const [result]: any = await p.query(sql, params.flat());
    return { changes: Number(result?.affectedRows ?? 0), lastInsertRowid: Number(result?.insertId ?? 0), insertId: Number(result?.insertId ?? 0) };
  }
}

function openDatabase() {
  getPool();
  return {
    prepare(sql: string) {
      return new PoolStatement(sql);
    },
    async exec(sql: string) {
      const p = getPool();
      await p.query(normalizeSql(sql));
    },
    pragma() { return this; },
    transaction(fn: () => void) {
      return async () => {
        const p = getPool();
        const conn = await p.getConnection();
        try {
          await conn.beginTransaction();
          await fn();
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
      };
    },
    close() { if (pool) { pool.end(); pool = null; } }
  };
}

export const db = openDatabase();
export function prep(sql: string) { const stmt = db.prepare(sql); return { get: (...p:any[]) => stmt.get(...p), all: (...p:any[]) => stmt.all(...p), run: (...p:any[]) => stmt.run(...p) }; }

export type Row = Record<string, any>;
export function parseJson<T>(value: string | null | undefined, fallback: T): T { if (!value) return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }

// Note: This pool implementation does NOT run initSchema. Use existing schema or run migration separately.

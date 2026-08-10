import mysql from 'mysql2/promise';

function normalizeSql(sql: string): string {
  return sql
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO')
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO')
    .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()')
    .replace(/date\(\s*'now'\s*\)/gi, 'CURDATE()')
    .replace(/date\(\s*'now'\s*,\s*'(-?\d+)\s*(days?|weeks?)'\s*\)/gi, (_match, amount, unit) => {
      const interval = Math.abs(Number(amount));
      const days = unit.toLowerCase().startsWith('w') ? interval * 7 : interval;
      return `DATE_SUB(CURDATE(), INTERVAL ${days} DAY)`;
    })
    .replace(/ON\s+CONFLICT\s*\(([^)]+)\)\s*DO\s+UPDATE\s+SET\s+/is, 'ON DUPLICATE KEY UPDATE ')
    .replace(/excluded\.([A-Za-z0-9_]+)/g, 'VALUES($1)')
    .replace(/\s*;\s*$/g, '');
}

function getConfig() {
  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'malli';
  const password = process.env.DB_PASSWORD || '8520';
  const database = process.env.DB_NAME || 'garuda_studyhub';
  const ssl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || process.env.DB_SSL === 'yes';

  const config: any = {
    host,
    port,
    user,
    password,
    database,
    charset: 'utf8mb4',
    multipleStatements: true,
    timezone: 'Z',
  };

  if (ssl) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

async function main() {
  const payload = process.argv[2];
  if (!payload) {
    throw new Error('No payload provided');
  }

  const { mode, sql, params = [] }: { mode: string; sql: string; params?: any[] } = JSON.parse(payload);
  const normalizedSql = normalizeSql(sql);
  const connection = await mysql.createConnection(getConfig());

  try {
    if (mode === 'exec') {
      await connection.query(normalizedSql);
      process.stdout.write(JSON.stringify({ ok: true }));
      return;
    }

    const [rows] = await connection.query(normalizedSql, params);
    if (mode === 'get') {
      process.stdout.write(JSON.stringify(Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined));
      return;
    }

    if (mode === 'all') {
      process.stdout.write(JSON.stringify(rows));
      return;
    }

    if (mode === 'run') {
      const result = rows as any;
      process.stdout.write(JSON.stringify({
        changes: Number(result?.affectedRows ?? 0),
        lastInsertRowid: Number(result?.insertId ?? 0),
        insertId: Number(result?.insertId ?? 0),
      }));
      return;
    }

    throw new Error(`Unsupported mode: ${mode}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

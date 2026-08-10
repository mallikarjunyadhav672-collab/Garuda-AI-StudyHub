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

function pickEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function normalizeDbHostAndPort(rawHost: string | undefined, rawPort: string | undefined) {
  const defaultPort = Number(rawPort || 3306);
  let host = rawHost?.trim();

  if (!host) {
    return { host: 'localhost', port: defaultPort };
  }

  const portMatch = host.match(/^(.*?):(\d+)$/);
  if (portMatch) {
    host = portMatch[1];
    const parsedPort = Number(portMatch[2]);
    return {
      host,
      port: Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : defaultPort,
    };
  }

  if (host.endsWith(':')) {
    host = host.slice(0, -1);
  }

  return { host, port: defaultPort };
}

function getConfig() {
  const dbHostValue = pickEnv('DB_HOST', 'MYSQLHOST');
  const dbPortValue = pickEnv('DB_PORT', 'MYSQLPORT');
  const { host, port } = normalizeDbHostAndPort(dbHostValue, dbPortValue);
  const user = pickEnv('DB_USER', 'MYSQLUSER', 'MYSQL_USERNAME') || 'root';
  const password = pickEnv('DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PWD') || '';
  const database = pickEnv('DB_NAME', 'MYSQLDATABASE', 'MYSQL_DB') || 'railway';
  const ssl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || process.env.DB_SSL === 'yes' || process.env.DB_SSL === 'TRUE';

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
  if (error instanceof Error && 'cause' in error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause) {
      console.error(cause);
    }
  }
  process.exit(1);
});

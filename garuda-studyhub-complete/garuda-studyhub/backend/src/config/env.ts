import 'dotenv/config';

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
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
  const defaultPort = num(rawPort, 3306);
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

const dbHostValue = pickEnv('DB_HOST', 'MYSQLHOST');
const dbPortValue = pickEnv('DB_PORT', 'MYSQLPORT');
const normalizedDb = normalizeDbHostAndPort(dbHostValue, dbPortValue);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT || process.env.RENDER_PORT || process.env.WEB_PORT, 3000),
  dbClient: process.env.DB_CLIENT || 'mysql',
  dbHost: normalizedDb.host,
  dbPort: normalizedDb.port,
  dbName: pickEnv('DB_NAME', 'MYSQLDATABASE', 'MYSQL_DB') || 'railway',
  dbUser: pickEnv('DB_USER', 'MYSQLUSER', 'MYSQL_USERNAME') || 'root',
  dbPassword: pickEnv('DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PWD') || '',
  dbSsl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || process.env.DB_SSL === 'yes' || process.env.DB_SSL === 'TRUE',
  dbPath: process.env.DB_PATH || './data/garuda.db',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  frontendUrls: (pickEnv('FRONTEND_URL', 'CLIENT_URL', 'APP_URL', 'VERCEL_URL', 'VERCEL_BRANCH_URL', 'RENDER_EXTERNAL_URL') || 'http://localhost:5173')
    .split(',')
    // Trim and remove any trailing slashes so comparisons are consistent
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  emailHost: process.env.EMAIL_HOST || '',
  emailPort: num(process.env.EMAIL_PORT, 587),
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@garuda.ai',
  emailSecure: process.env.EMAIL_SECURE === 'true',
  verifyTokenTtlMinutes: num(process.env.VERIFY_TOKEN_TTL_MINUTES, 30),
  resetTokenTtlMinutes: num(process.env.RESET_TOKEN_TTL_MINUTES, 30),
};

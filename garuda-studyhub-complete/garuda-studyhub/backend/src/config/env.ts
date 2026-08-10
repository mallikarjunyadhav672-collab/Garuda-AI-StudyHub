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

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 5000),
  dbClient: process.env.DB_CLIENT || 'mysql',
  dbHost: pickEnv('DB_HOST', 'MYSQLHOST') || 'localhost',
  dbPort: num(pickEnv('DB_PORT', 'MYSQLPORT'), 3306),
  dbName: pickEnv('DB_NAME', 'MYSQLDATABASE', 'MYSQL_DB') || 'garuda_studyhub',
  dbUser: pickEnv('DB_USER', 'MYSQLUSER', 'MYSQL_USERNAME') || 'malli',
  dbPassword: pickEnv('DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PWD') || '8520',
  dbSsl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1' || process.env.DB_SSL === 'yes' || process.env.DB_SSL === 'TRUE',
  dbPath: process.env.DB_PATH || './data/garuda.db',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
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

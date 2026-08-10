import 'dotenv/config';

function num(v: string | undefined, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: num(process.env.PORT, 5000),
  dbClient: process.env.DB_CLIENT || 'mysql',
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: num(process.env.DB_PORT, 3306),
  dbName: process.env.DB_NAME || 'garuda_studyhub',
  dbUser: process.env.DB_USER || 'malli',
  dbPassword: process.env.DB_PASSWORD || '8520',
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

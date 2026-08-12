import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env';
import { db } from './db/database';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error';

const app = express();

// Trust the preview proxy so rate limiting works correctly behind it
app.set('trust proxy', 1);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow configured frontend origins (plus preview origin when present)
const allowedOrigins = [...env.frontendUrls];

const corsOptions = {
  origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
    // Debug log to diagnose CORS rejections in production
    // eslint-disable-next-line no-console
    console.debug('[cors] checking origin:', origin, 'allowedOrigins:', allowedOrigins);
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    // Allow sandbox preview hosts like https://5173-xxxx.e2b.app
    if (/^https:\/\/\d+-[a-z0-9]+\.e2b\.app$/.test(origin)) return cb(null, true);
    // Allow Vercel deployment hosts (production + preview)
    if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/.test(origin) || /^https:\/\/([a-z0-9-]+\.)*vercel\.dev$/.test(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests so they always receive CORS headers
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '1mb' }));

// Immediate request logger: logs arrival of each HTTP request so we can
// observe requests that hang before a response is sent (morgan logs at
// response finish, so long-running requests may not appear immediately).
app.use((req, _res, next) => {
  try {
    // eslint-disable-next-line no-console
    console.debug('[req] received', { method: req.method, url: req.originalUrl, origin: req.headers.origin || req.headers.referer });
  } catch (e) {
    // ignore
  }
  next();
});

app.use(morgan(env.isProd ? 'combined' : 'dev'));

// Serve uploaded files (avatars, materials, notices)
const uploadsDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir, { maxAge: env.isProd ? '7d' : 0 }));

// Rate limiting
const generalLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true });
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/login',
});
app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

// Health check — includes live database status
app.get('/api/health', async (_req, res) => {
  let dbStatus: any = { connected: false };
  try {
    const tables = (await db.prepare('SELECT COUNT(*) as c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()').get()) as { c: number };
    const users = (await db.prepare('SELECT COUNT(*) as c FROM users').get()) as { c: number };
    dbStatus = { connected: true, tables: Number(tables?.c ?? 0), users: Number(users?.c ?? 0) };
  } catch (e: any) {
    dbStatus = { connected: false, error: e.message };
  }
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'Garuda AI StudyHub API',
    database: dbStatus,
    time: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Garuda AI StudyHub API is running. The frontend is served separately; use /api/health for health checks and /api/auth/login for authentication.',
  });
});

app.get('/api', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Garuda API root. Use /api/health for health checks or /api/auth/login for authentication.',
  });
});

app.use('/api', routes);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

export default app;

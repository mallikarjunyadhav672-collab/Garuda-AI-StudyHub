import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { db, prep } from '../db/database.pool';
import {
  requireAuth,
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  hashToken,
} from '../middleware';
import { env } from '../config/env';
import { ApiError, asyncHandler, ok } from '../utils/helpers';
import { validate } from '../middleware';

const router = Router();

const emailSchema = z.string().email('Enter a valid email');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  email: emailSchema,
  phone: z
    .string()
    .regex(/^(\+91[\s-]?)?[0]?[6789]\d{9}$/, 'Enter a valid Indian mobile number')
    .optional()
    .or(z.literal('')),
  password: passwordSchema,
  examTarget: z.string().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

function publicUser(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    examTarget: row.exam_target,
    isVerified: !!row.is_verified,
    isPremium: !!row.is_premium,
    premiumExpiresAt: row.premium_expires_at,
    authProvider: row.auth_provider,
    createdAt: row.created_at,
  };
}

// POST /api/auth/register
router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const start = Date.now();
    console.debug('[API] POST /api/auth/register started');
    console.debug('[API] POST /api/auth/register validation passed');

    const { name, email, phone, password, examTarget } = req.body;

    console.debug('[DB] POST /api/auth/register duplicate-email check started');
    const existing = await prep('SELECT id FROM users WHERE lower(email) = lower(?)').get(email);
    console.debug('[DB] POST /api/auth/register duplicate-email check completed', { found: !!existing });
    if (existing) {
      console.debug('[API] POST /api/auth/register completed status=409 duration=', Date.now() - start);
      throw new ApiError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
    }

    console.debug('[DB] POST /api/auth/register password hash started');
    const passwordHash = await bcrypt.hash(password, 12);
    console.debug('[DB] POST /api/auth/register password hash completed');

    console.debug('[DB] register user query started');
    const info = await db
      .prepare(
        `INSERT INTO users (name, email, phone, password_hash, exam_target, role)
         VALUES (?, ?, ?, ?, ?, 'user')`
      )
      .run(name, email.toLowerCase().trim(), phone || null, passwordHash, examTarget || null);
    console.debug('[DB] register user query completed', { info });

    const userId = Number(info.lastInsertRowid || info.insertId || 0);

    if (!userId) {
      console.debug('[API] POST /api/auth/register failed to create user');
      throw new ApiError(500, 'Failed to create user', 'USER_CREATE_FAILED');
    }

    console.debug('[DB] inserting default user_preferences');
    await prep('INSERT INTO user_preferences (user_id) VALUES (?)').run(userId);

    console.debug('[DB] fetching created user');
    const row = await prep('SELECT * FROM users WHERE id = ?').get(userId);
    if (!row) {
      console.debug('[API] POST /api/auth/register failed to load created user');
      throw new ApiError(500, 'Failed to load created user', 'USER_CREATE_FAILED');
    }

    const user = publicUser(row);
    const token = issueToken(userId, 'verify');
    const verifyUrl = new URL(`/verify-email/${token}`, env.frontendUrls[0] || 'http://localhost:5173').toString();

    try {
      console.debug('[API] sending verification email (or logging token)');
      await sendEmail(
        user.email,
        'Verify your Garuda StudyHub email',
        `<p>Hi ${user.name},</p><p>Thanks for registering at Garuda StudyHub. Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">Verify Email</a></p><p>This link expires in ${env.verifyTokenTtlMinutes} minutes.</p>`
      );
      console.debug('[API] sendEmail completed');
    } catch (err) {
      console.error('[API] sendEmail failed', { err });
      await prep('DELETE FROM auth_tokens WHERE user_id = ?').run(userId);
      await prep('DELETE FROM user_preferences WHERE user_id = ?').run(userId);
      await prep('DELETE FROM users WHERE id = ?').run(userId);
      throw new ApiError(500, 'Failed to send verification email. Please try again later.', 'EMAIL_SEND_FAILED');
    }

    console.debug('[DB] inserting welcome notification');
    await prep(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES (?, 'system', ?, ?)`
    ).run(userId, 'Welcome to Garuda AI StudyHub 🚀', 'Your account has been created. Verify your email to start using the app.');

    const response: any = {
      user,
      message: 'Account created. Check your email to verify your address before logging in.',
    };
    if (!env.emailHost || !env.emailUser || !env.emailPass) {
      response.verifyToken = token;
      response.notice = 'Email is not configured for SMTP. Use the verification token returned here for testing.';
    }

    console.debug('[API] POST /api/auth/register completed status=201 duration=', Date.now() - start);
    ok(res, response, 201);
  })
);

// POST /api/auth/login
router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const row = await prep('SELECT * FROM users WHERE lower(email) = lower(?)').get(email.trim());
    if (!row) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
 
    if (!row.is_verified) {
      throw new ApiError(
        403,
        'Email not verified. Please verify your email before logging in.',
        'EMAIL_NOT_VERIFIED'
      );
    }
 
    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
 
    const user = publicUser(row);
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);
    storeRefreshToken(user.id, refreshToken);
 
    await prep(`UPDATE users SET updated_at = datetime('now') WHERE id = ?`).run(user.id);
    ok(res, { user, accessToken, refreshToken });
  })
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const stored = await prep('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(hashToken(refreshToken));
    if (!stored) throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');

    const row = await prep('SELECT * FROM users WHERE id = ?').get(stored.user_id);
    if (!row) throw new ApiError(401, 'User no longer exists', 'UNAUTHORIZED');
    if (!row.is_verified) throw new ApiError(403, 'Email not verified', 'EMAIL_NOT_VERIFIED');
 
    const user = publicUser(row);
    const accessToken = signAccessToken(user);
    // Rotation: revoke old, issue new
    revokeRefreshToken(refreshToken);
    const newRefresh = signRefreshToken(user.id);
    storeRefreshToken(user.id, newRefresh);

    ok(res, { user, accessToken, refreshToken: newRefresh });
  })
);

// POST /api/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = (req.body?.refreshToken as string) || '';
    if (token) revokeRefreshToken(token);
    ok(res, { message: 'Logged out successfully' });
  })
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const row = await prep('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    if (!row) throw new ApiError(404, 'User not found', 'NOT_FOUND');
    ok(res, { user: publicUser(row) });
  })
);

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema })),
  asyncHandler(async (req, res) => {
    const row = await prep('SELECT * FROM users WHERE id = ?').get(req.user!.id);
    const match = await bcrypt.compare(req.body.currentPassword, row.password_hash);
    if (!match) throw new ApiError(400, 'Current password is incorrect', 'WRONG_PASSWORD');
    const hash = await bcrypt.hash(req.body.newPassword, 12);
    await prep(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, row.id);
    await prep('DELETE FROM refresh_tokens WHERE user_id = ?').run(row.id);
    ok(res, { message: 'Password updated. Please login again.' });
  })
);

// ---------------------------------------------------------------------------
// Forgot / Reset password + Email verification (token based)
// In development (no SMTP), the token is returned in the response so the flow
// can be tested end-to-end. With SMTP configured the token is emailed instead.
// ---------------------------------------------------------------------------
const transporter = env.emailHost && env.emailUser && env.emailPass
  ? nodemailer.createTransport({
      host: env.emailHost,
      port: env.emailPort,
      secure: env.emailSecure,
      auth: {
        user: env.emailUser,
        pass: env.emailPass,
      },
    })
  : null;

function issueToken(userId: number, kind: 'reset' | 'verify'): string {
  const token = crypto.randomBytes(24).toString('hex');
  const ttlMinutes = kind === 'reset' ? env.resetTokenTtlMinutes : env.verifyTokenTtlMinutes;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  prep('DELETE FROM auth_tokens WHERE user_id = ? AND kind = ?').run(userId, kind);
  prep(`INSERT INTO auth_tokens (user_id, token, kind, expires_at) VALUES (?, ?, ?, ?)`)
    .run(userId, crypto.createHash('sha256').update(token).digest('hex'), kind, expiresAt);
  return token;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (transporter) {
    await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, ''),
    });
    return;
  }
  console.log(`[MAIL] to=${to} subject="${subject}"\n${html}`);
}

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const row = prep('SELECT * FROM users WHERE lower(email) = lower(?)').get(req.body.email.trim());
    if (!row) throw new ApiError(404, 'No account found with this email', 'NOT_FOUND');
    const token = issueToken(row.id, 'reset');
    await sendEmail(row.email, 'Reset your Garuda StudyHub password', `Use code ${token} to reset your password.`);
    // In production, remove resetToken from the response (email only).
    ok(res, { message: 'If the account exists, a reset link/token has been sent.', resetToken: token });
  })
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate(z.object({ token: z.string().min(10), newPassword: passwordSchema })),
  asyncHandler(async (req, res) => {
    const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const t = prep(
      `SELECT * FROM auth_tokens WHERE token = ? AND kind = 'reset' AND expires_at > datetime('now')`
    ).get(tokenHash);
    if (!t) throw new ApiError(400, 'Invalid or expired reset token', 'INVALID_TOKEN');
    const hash = await bcrypt.hash(req.body.newPassword, 12);
    prep(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, t.user_id);
    prep(`DELETE FROM auth_tokens WHERE user_id = ? AND kind = 'reset'`).run(t.user_id);
    prep('DELETE FROM refresh_tokens WHERE user_id = ?').run(t.user_id);
    ok(res, { message: 'Password reset successfully. Please login.' });
  })
);

// GET /api/auth/verify-email/:token
router.get('/verify-email/:token', asyncHandler(async (req, res) => {
  const tokenHash = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const t = prep(
    `SELECT * FROM auth_tokens WHERE token = ? AND kind = 'verify' AND expires_at > datetime('now')`
  ).get(tokenHash);
  if (!t) throw new ApiError(400, 'Invalid or expired verification token', 'INVALID_TOKEN');
  prep(`UPDATE users SET is_verified = 1, updated_at = datetime('now') WHERE id = ?`).run(t.user_id);
  prep(`DELETE FROM auth_tokens WHERE user_id = ? AND kind = 'verify'`).run(t.user_id);
  ok(res, { message: 'Email verified successfully. You can now login.' });
}));

// POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const row = prep('SELECT * FROM users WHERE lower(email) = lower(?)').get(req.body.email.trim());
    if (!row || row.is_verified) return ok(res, { message: 'If the account is unverified, a new link has been sent.' });
    const token = issueToken(row.id, 'verify');
    const verifyUrl = new URL(`/verify-email/${token}`, env.frontendUrls[0] || 'http://localhost:5173').toString();
    await sendEmail(
      row.email,
      'Verify your Garuda StudyHub email',
      `<p>Hi ${row.name},</p><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">Verify Email</a></p><p>This link expires in ${env.verifyTokenTtlMinutes} minutes.</p>`
    );
    const response: any = { message: 'Verification link sent.' };
    if (!env.emailHost || !env.emailUser || !env.emailPass) response.verifyToken = token;
    ok(res, response);
  })
);

export default router;

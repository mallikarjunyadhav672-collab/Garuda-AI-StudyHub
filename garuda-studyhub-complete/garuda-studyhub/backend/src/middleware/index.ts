import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env';
import { db, prep } from '../db/database.pool';
import { ApiError } from '../utils/helpers';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isPremium: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtAccessSecret, {
    expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'],
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenTtl as jwt.SignOptions['expiresIn'],
  } as jwt.SignOptions);
}

export function hashToken(token: string): string {
  // crypto imported at top
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(userId: number, token: string): Promise<void> {
  // crypto imported at top
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const toMysqlDateTime = (input: Date) => input.toISOString().slice(0, 19).replace('T', ' ');
  const expiresAt = decoded?.exp
    ? toMysqlDateTime(new Date(decoded.exp * 1000))
    : toMysqlDateTime(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  // remove old expired tokens for this user
  await prep('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < ?').run(
    userId,
    toMysqlDateTime(new Date())
  );
  // insert the new refresh token
  await prep('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(
    userId,
    hashToken(token),
    expiresAt
  );
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prep('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hashToken(token));
}

/** JWT auth middleware — requires a valid Bearer access token */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Authentication required', 'UNAUTHORIZED'));

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret) as AuthUser;
    const user = await prep('SELECT id, name, email, role, is_premium, is_verified FROM users WHERE id = ?').get(
      payload.id
    ) as
      | { id: number; name: string; email: string; role: string; is_premium: number; is_verified: number }
      | undefined;
    if (!user) return next(new ApiError(401, 'User no longer exists', 'UNAUTHORIZED'));
    if (!user.is_verified) return next(new ApiError(403, 'Email not verified', 'EMAIL_NOT_VERIFIED'));
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: !!user.is_premium,
    };
    next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
}

/** Optional auth — attaches user if a valid token exists, never errors */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret) as AuthUser;
      req.user = { id: payload.id, name: payload.name, email: payload.email, role: payload.role, isPremium: payload.isPremium };
    } catch {
      /* ignore */
    }
  }
  next();
}

/** RBAC — must come after requireAuth */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return next(new ApiError(403, 'Admin access required', 'FORBIDDEN'));
  }
  next();
}

/** Zod validation middleware */
export function validate(schema: { parse: (v: unknown) => unknown }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: any) {
      const issues = err?.issues?.map((i: any) => ({ path: i.path.join('.'), message: i.message }));
      next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', issues));
    }
  };
}


import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/helpers';
import { env } from '../config/env';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Route not found', 'NOT_FOUND'));
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProd ? 'Something went wrong on the server.' : err.message,
      details: env.isProd ? undefined : err.stack,
    },
  });
}

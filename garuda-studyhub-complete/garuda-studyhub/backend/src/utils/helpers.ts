import type { NextFunction, Request, Response } from 'express';

/** App-level API error with optional status code */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Wrap async route handlers so rejected promises reach the error handler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

/** Consistent success response shape */
export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

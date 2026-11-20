import type { NextFunction, Request, Response } from 'express';
import { config } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
  }
  const e = err as { type?: string; status?: number; message?: string };
  if (e?.type === 'entity.too.large') return res.status(413).json({ success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request is too large' } });
  if (e?.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: { code: 'BAD_JSON', message: 'Malformed JSON body' } });
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: config.isProd ? 'Something went wrong. Please try again.' : String(e?.message ?? err) },
  });
};

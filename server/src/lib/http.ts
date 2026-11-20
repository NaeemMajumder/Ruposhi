import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { config } from '../config/env.js';

export const ok = <T,>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });

export const created = <T,>(res: Response, data: T) => ok(res, data, undefined, 201);

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * True when the request came through OUR Next.js app (its /api/v1 proxy or a Server Component fetch).
 * Behind the storefront every request reaches the API from Vercel's network, so the socket IP is Vercel's —
 * the Next app sends the visitor's IP plus this shared secret instead. Without the secret the headers are ignored.
 */
export const fromOurProxy = (req: Request) => {
  const key = req.get('x-rp-proxy');
  return !!config.proxySecret && typeof key === 'string' && same(key, config.proxySecret);
};

/** The visitor's IP ('' for our own server-side fetches). Never trusts a client-supplied header on its own. */
export const clientIp = (req: Request) => {
  if (fromOurProxy(req)) return String(req.get('x-rp-client-ip') ?? '').trim().slice(0, 64);
  return (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
};

/** Paging helper: clamps page/limit to safe bounds. */
export const paging = (q: { page?: number; limit?: number }, max = 100) => {
  const limit = Math.min(Math.max(Number(q.limit) || 20, 1), max);
  const page = Math.max(Number(q.page) || 1, 1);
  return { page, limit, skip: (page - 1) * limit };
};

/** Parses from/to (YYYY-MM-DD) into an inclusive ISO range. Defaults to the last `days` days. */
export const dateRange = (from?: string, to?: string, days = 30) => {
  const end = to ? new Date(`${to}T23:59:59.999`) : new Date();
  const start = from ? new Date(`${from}T00:00:00.000`) : new Date(end.getTime() - (days - 1) * 86400000);
  if (!from) start.setHours(0, 0, 0, 0);
  return { start, end, startIso: start.toISOString(), endIso: end.toISOString() };
};

export const sendFile = (res: Response, buffer: Buffer | ArrayBuffer, filename: string, mime: string) => {
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.-]/g, '_')}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(Buffer.from(buffer as ArrayBuffer));
};

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

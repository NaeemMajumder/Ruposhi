import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { config } from '../../config/env.js';
import { clientIp, fromOurProxy } from '../../lib/http.js';

/** Removes keys starting with "$" or containing "." anywhere in body/query → blocks NoSQL operator injection. */
const scrub = (v: unknown, depth = 0): unknown => {
  if (depth > 8 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => scrub(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (k.startsWith('$') || k.includes('.') || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    out[k] = scrub(val, depth + 1);
  }
  return out;
};

export const sanitize = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') req.body = scrub(req.body);
  // Express 5: req.query is a getter — sanitise into a validated copy instead of reassigning.
  const q = scrub(req.query) as Record<string, unknown>;
  Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true });
  next();
};

const limiter = (windowMs: number, limit: number, message: string) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message } },
    // the visitor's real IP even behind the storefront proxy (IPv6 grouped by /56 so one user can't rotate addresses)
    keyGenerator: (req) => ipKeyGenerator(clientIp(req) || 'unknown'),
    // the storefront's own server-side page fetches (no visitor IP) are cached by Next and never rate-limited
    skip: (req) => config.env === 'test' || (fromOurProxy(req) && !req.get('x-rp-client-ip')),
  });

export const globalLimiter = limiter(60_000, 300, 'Too many requests. Please slow down.');
// per IP — generous because BD mobile carriers put many users behind one IP (CGNAT); per-phone caps live in otp.service
export const otpLimiter = limiter(15 * 60_000, 30, 'Too many OTP requests. Try again in 15 minutes.');
export const checkoutLimiter = limiter(10 * 60_000, 20, 'Too many checkout attempts. Please wait a few minutes.');
export const writeLimiter = limiter(60_000, 30, 'Too many submissions. Please wait a minute.');
export const searchLimiter = limiter(60_000, 120, 'Too many searches. Please slow down.');
/** Login / register / reset — per IP, on top of the per-account lockout (5 wrong passwords → 15 min). */
export const authLimiter = limiter(15 * 60_000, 30, 'Too many sign-in attempts. Please wait 15 minutes.');

/**
 * CSRF defence for cookie-authenticated requests: a state-changing request that carries a session cookie
 * must come from one of our own origins (Origin, or Referer as a fallback). SameSite=Lax already blocks
 * most cross-site posts; this closes the rest (e.g. same-site sub-domains, old browsers).
 */
export const originCheck = (req: Request, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
  if (!cookies.rp_session && !cookies.rp_staff) return next();
  const src = req.headers.origin ?? (req.headers.referer ? new URL(String(req.headers.referer)).origin : undefined);
  const host = `${req.protocol}://${req.get('host')}`;
  if (src && (config.corsOrigins.includes(src) || src === host)) return next();
  res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Request blocked (cross-site).' } });
};

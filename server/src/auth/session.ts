import type { CookieOptions, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Sessions = short JWTs in httpOnly cookies (never readable by JS → safe from XSS token theft).
 * Customer and staff sessions use different cookies, secrets and audiences, so one can never be used as the other.
 * Each token carries the account's `tokenVersion`; bumping it (password change / logout-everywhere) revokes all sessions.
 */
export type Kind = 'customer' | 'staff';

export const COOKIE: Record<Kind, string> = { customer: 'rp_session', staff: 'rp_staff' };
const AUD: Record<Kind, string> = { customer: 'ruposhi:customer', staff: 'ruposhi:staff' };
const ISSUER = 'ruposhi-api';

export const secretFor = (k: Kind) => (k === 'customer' ? config.auth.jwtSecret : config.auth.jwtAdminSecret);
export const ttlFor = (k: Kind) => (k === 'customer' ? config.auth.customerSessionMs : config.auth.adminSessionMs);
export const jwtOptions = (k: Kind) => ({ audience: AUD[k], issuer: ISSUER, algorithms: ['HS256'] as jwt.Algorithm[] });

export type Claims = { sub: string; tv: number; kind: Kind };

const cookieOpts = (k: Kind): CookieOptions => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  path: '/',
  domain: config.auth.cookieDomain,
  maxAge: ttlFor(k),
});

export const issueSession = (res: Response, k: Kind, sub: string, tokenVersion: number) => {
  const token = jwt.sign({ tv: tokenVersion, kind: k } satisfies Omit<Claims, 'sub'>, secretFor(k), {
    subject: sub,
    audience: AUD[k],
    issuer: ISSUER,
    algorithm: 'HS256',
    expiresIn: Math.floor(ttlFor(k) / 1000),
  });
  res.cookie(COOKIE[k], token, cookieOpts(k));
};

export const clearSession = (res: Response, k: Kind) => {
  const { maxAge: _m, ...opts } = cookieOpts(k);
  res.clearCookie(COOKIE[k], opts);
};

export const cookieToken = (k: Kind) => (req: Request) => {
  const v = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE[k]];
  return typeof v === 'string' && v.length < 2048 ? v : null;
};

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import type { NextFunction, Request, Response } from 'express';
import { repos } from '../repositories/index.js';
import { clientIp } from '../lib/http.js';
import { unauthorized } from '../lib/errors.js';
import { authenticateCustomer, authenticateStaff } from '../services/auth.service.js';
import type { Customer, Staff } from '../types/domain.js';
import { cookieToken, jwtOptions, secretFor, type Claims } from './session.js';

/**
 * Passport.js strategies (stateless — no server sessions, `session: false` everywhere):
 *  • customer-local : email OR phone + password      → POST /auth/login
 *  • staff-local    : email + password               → POST /admin/auth/login
 *  • customer-jwt   : httpOnly `rp_session` cookie   → every /me/* route
 *  • staff-jwt      : httpOnly `rp_staff` cookie     → every /admin/* route
 */
passport.use(
  'customer-local',
  new LocalStrategy({ usernameField: 'identifier', passwordField: 'password', session: false, passReqToCallback: true }, (req, identifier, password, done) => {
    authenticateCustomer(identifier, password, clientIp(req)).then((c) => done(null, c), done);
  }),
);

passport.use(
  'staff-local',
  new LocalStrategy({ usernameField: 'email', passwordField: 'password', session: false, passReqToCallback: true }, (req, email, password, done) => {
    authenticateStaff(email, password, clientIp(req)).then((s) => done(null, s), done);
  }),
);

passport.use(
  'customer-jwt',
  new JwtStrategy({ jwtFromRequest: ExtractJwt.fromExtractors([cookieToken('customer')]), secretOrKey: secretFor('customer'), ...jwtOptions('customer') }, (claims: Claims, done) => {
    repos.customers
      .findById(claims.sub)
      .then((c) => (c?.auth && !c.blocked && c.auth.tokenVersion === claims.tv ? done(null, c) : done(null, false)))
      .catch(done);
  }),
);

passport.use(
  'staff-jwt',
  new JwtStrategy({ jwtFromRequest: ExtractJwt.fromExtractors([cookieToken('staff')]), secretOrKey: secretFor('staff'), ...jwtOptions('staff') }, (claims: Claims, done) => {
    repos.staff
      .findById(claims.sub)
      .then((s) => (s?.auth && s.active && s.auth.tokenVersion === claims.tv ? done(null, s) : done(null, false)))
      .catch(done);
  }),
);

export { passport };

/** Promise wrapper around passport.authenticate with a custom callback (keeps our JSON error format). */
export const runStrategy = <T>(name: string, req: Request, res: Response) =>
  new Promise<T | null>((resolve, reject) => {
    passport.authenticate(name, { session: false }, (err: unknown, user: T | false, info?: { message?: string }) => {
      if (err) return reject(err);
      if (!user && info?.message === 'Missing credentials') return reject(unauthorized('Please enter your login details.'));
      resolve(user || null);
    })(req, res, () => undefined);
  });

export type AuthedCustomer = Customer;
export type AuthedStaff = Staff;
export type { NextFunction };

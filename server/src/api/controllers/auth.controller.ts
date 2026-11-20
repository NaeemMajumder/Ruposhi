import type { Request, Response } from 'express';
import { clientIp, created, ok } from '../../lib/http.js';
import { runStrategy } from '../../auth/passport.js';
import { clearSession, issueSession } from '../../auth/session.js';
import { permissionsFor } from '../middlewares/rbac.js';
import * as auth from '../../services/auth.service.js';
import { audit } from '../../services/audit.service.js';
import type { Customer, Staff } from '../../types/domain.js';

const signIn = (res: Response, c: Customer) => issueSession(res, 'customer', c._id, c.auth!.tokenVersion);
const signInStaff = (res: Response, s: Staff) => issueSession(res, 'staff', s._id, s.auth!.tokenVersion);
const staffView = (s: Staff) => ({ ...auth.staffSessionView(s), id: s._id, permissions: permissionsFor(s.role) });

export const authController = {
  /* ───────────── customers ───────────── */
  check: async (req: Request, res: Response) => ok(res, await auth.availability(req.body.email, req.body.phone)),

  register: async (req: Request, res: Response) => {
    const c = await auth.registerCustomer(req.body);
    signIn(res, c);
    created(res, { user: auth.customerSessionView(c) });
  },

  /** Passport `customer-local`: identifier = email or phone */
  login: async (req: Request, res: Response) => {
    const c = (await runStrategy<Customer>('customer-local', req, res))!;
    signIn(res, c);
    ok(res, { user: auth.customerSessionView(c) });
  },

  logout: (_req: Request, res: Response) => {
    clearSession(res, 'customer');
    ok(res, { signedOut: true });
  },

  logoutAll: async (req: Request, res: Response) => {
    await auth.logoutEverywhere(req.customerId!);
    clearSession(res, 'customer');
    ok(res, { signedOut: true });
  },

  /** Session probe — 200 with user:null for guests (no console noise from 401s on every page). */
  me: (req: Request, res: Response) => ok(res, { user: req.customer ? auth.customerSessionView(req.customer) : null }),

  forgot: async (req: Request, res: Response) => ok(res, await auth.requestPasswordReset(req.body.phone)),

  reset: async (req: Request, res: Response) => {
    const c = await auth.resetPassword(req.body.phone, req.body.code, req.body.password);
    signIn(res, c);
    ok(res, { user: auth.customerSessionView(c) });
  },

  changePassword: async (req: Request, res: Response) => {
    const c = await auth.changeCustomerPassword(req.customerId!, req.body.current, req.body.password);
    signIn(res, c); // all other devices are signed out (tokenVersion bumped); this one stays in
    ok(res, { changed: true });
  },

  changeEmail: async (req: Request, res: Response) => {
    const c = await auth.changeCustomerEmail(req.customerId!, req.body.email, req.body.password);
    ok(res, { user: auth.customerSessionView(c) });
  },

  /* ───────────── staff ───────────── */
  staffLogin: async (req: Request, res: Response) => {
    const s = (await runStrategy<Staff>('staff-local', req, res))!;
    signInStaff(res, s);
    ok(res, { user: staffView(s) });
  },

  staffLogout: async (req: Request, res: Response) => {
    clearSession(res, 'staff');
    if (req.admin) await audit({ name: req.admin.name, role: req.admin.role, ip: clientIp(req) }, 'staff.logout', 'staff', req.admin.id);
    ok(res, { signedOut: true });
  },

  staffPassword: async (req: Request, res: Response) => {
    const s = await auth.changeStaffPassword(req.admin!.id, req.body.current, req.body.password);
    signInStaff(res, s);
    await audit({ name: s.name, role: s.role, ip: clientIp(req) }, 'staff.password_changed', 'staff', s._id);
    ok(res, { changed: true });
  },
};

import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../../lib/errors.js';
import type { AdminRole, Staff } from '../../types/domain.js';
import { runStrategy } from '../../auth/passport.js';

/**
 * Role-based access control for the admin API.
 * Authentication: Passport `staff-jwt` (httpOnly `rp_staff` cookie) — the role comes from the DATABASE,
 * never from anything the browser sends. Every route depends only on `req.admin`.
 */
export type Permission =
  | 'dashboard.view' | 'orders.view' | 'orders.update' | 'orders.export' | 'products.view' | 'products.edit' | 'products.price'
  | 'products.delete' | 'inventory.edit' | 'customers.view' | 'customers.edit' | 'marketing.manage' | 'reports.view'
  | 'cms.edit' | 'settings.edit' | 'staff.manage' | 'audit.view' | 'backup.manage';

const ROLE_PERMISSIONS: Record<AdminRole, Permission[] | '*'> = {
  owner: '*',
  manager: [
    'dashboard.view', 'orders.view', 'orders.update', 'orders.export', 'products.view', 'products.edit', 'products.price',
    'inventory.edit', 'customers.view', 'customers.edit', 'marketing.manage', 'reports.view', 'cms.edit', 'audit.view',
  ],
  order_staff: ['dashboard.view', 'orders.view', 'orders.update', 'customers.view', 'products.view'],
  content_editor: ['dashboard.view', 'products.view', 'products.edit', 'cms.edit'],
};

export const can = (role: AdminRole, p: Permission) => {
  const perms = ROLE_PERMISSIONS[role];
  return perms === '*' || perms.includes(p);
};

export const permissionsFor = (role: AdminRole) => (ROLE_PERMISSIONS[role] === '*' ? 'all' : ROLE_PERMISSIONS[role]);

declare module 'express-serve-static-core' {
  interface Request {
    admin?: { id: string; name: string; email: string; role: AdminRole };
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  runStrategy<Staff>('staff-jwt', req, res)
    .then((s) => {
      if (!s) return next(unauthorized('Admin session expired. Please sign in again.'));
      req.admin = { id: s._id, name: s.name, email: s.email, role: s.role };
      next();
    })
    .catch(next);
};

export const requirePermission = (p: Permission) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.admin) return next(unauthorized());
  if (!can(req.admin.role, p)) return next(forbidden(`Your role (${req.admin.role}) cannot perform: ${p}`));
  next();
};

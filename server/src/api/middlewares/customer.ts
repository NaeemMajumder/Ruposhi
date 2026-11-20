import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../../lib/errors.js';
import { runStrategy } from '../../auth/passport.js';
import type { Customer } from '../../types/domain.js';

declare module 'express-serve-static-core' {
  interface Request {
    customerId?: string;
    customer?: Customer;
  }
}

/** Requires a signed-in customer (Passport `customer-jwt` reading the httpOnly session cookie). */
export const requireCustomer = (req: Request, res: Response, next: NextFunction) => {
  runStrategy<Customer>('customer-jwt', req, res)
    .then((c) => {
      if (!c) return next(unauthorized('Please sign in to continue.'));
      req.customer = c;
      req.customerId = c._id;
      next();
    })
    .catch(next);
};

/** Attaches the customer when signed in, but never blocks (guest checkout, quotes…). */
export const optionalCustomer = (req: Request, res: Response, next: NextFunction) => {
  runStrategy<Customer>('customer-jwt', req, res)
    .then((c) => {
      if (c) {
        req.customer = c;
        req.customerId = c._id;
      }
      next();
    })
    .catch(() => next());
};

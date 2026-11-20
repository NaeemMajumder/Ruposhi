import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { badRequest } from '../../lib/errors.js';

type Part = 'body' | 'query' | 'params';

/** Validates + coerces a request part with Zod. Unknown keys are stripped. */
export const validate =
  (schema: z.ZodType, part: Part = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(badRequest(details[0]?.message ? `${details[0].path ? `${details[0].path}: ` : ''}${details[0].message}` : 'Invalid request', details));
    }
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
    next();
  };

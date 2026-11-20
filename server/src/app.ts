import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './api/middlewares/errorHandler.js';
import { globalLimiter, originCheck, sanitize } from './api/middlewares/security.js';
import { passport } from './auth/passport.js';
import { router } from './api/routes/index.js';
import { ready } from './boot.js';

/** Express app (no listen) — security first, then parsing, then routes. */
export const createApp = () => {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    }),
  );
  app.use(
    cors({
      // unknown origins simply get no CORS headers (the browser blocks them); cookie-carrying writes are also rejected by originCheck
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Idempotency-Key', 'x-signature'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(
    express.json({
      limit: '200kb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody: string }).rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(cookieParser());
  app.use(passport.initialize());
  app.use(sanitize);
  if (!config.isProd) app.use(morgan('dev'));
  app.use('/api', globalLimiter);
  app.use('/api', originCheck);

  app.get('/', (_req, res) => res.json({ name: 'Ruposhi API', version: '1.0.0', docs: '/api/v1/health' }));
  app.use('/api/v1', router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

/**
 * Default export = the deployed app (Vercel detects Express and runs this as one function).
 * Every request first waits for the one-time start-up (DB connection, demo data); after that it is free.
 */
const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  ready().then(
    () => next(),
    (e: unknown) => {
      console.error('Start-up failed:', e);
      res.status(503).json({ success: false, error: { code: 'UNAVAILABLE', message: 'The server is starting up — please try again in a moment.' } });
    },
  );
});
app.use(createApp());

export default app;

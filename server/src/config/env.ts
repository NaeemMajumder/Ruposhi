import 'dotenv/config';
import { z } from 'zod';

/**
 * Centralised, validated configuration.
 * Every env var the API reads is declared here — nothing else touches process.env.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  DATA_SOURCE: z.enum(['memory', 'mongo']).default('memory'),
  MONGODB_URI: z.string().optional(),
  // database inside the cluster — always this one, whatever the URI says (keeps other apps' data on the same cluster untouched)
  MONGODB_DB: z.string().regex(/^[\w-]{1,38}$/).default('ruposhi'),
  // unset → demo ON for local/dev, OFF in production (set DEMO_MODE=false once real SMS/gateway keys are in)
  DEMO_MODE: z.string().optional(),
  OTP_SECRET: z.string().min(8).default('change-me-otp-secret'),
  WEBHOOK_SECRET: z.string().min(8).default('change-me-webhook-secret'),
  PAYMENT_SECRET: z.string().min(8).default('change-me-payment-secret'),
  // auth — separate secrets so a leaked customer token can never be used on the admin API
  JWT_SECRET: z.string().min(16).default('dev-only-change-me-customer-jwt-secret'),
  JWT_ADMIN_SECRET: z.string().min(16).default('dev-only-change-me-admin-jwt-secret'),
  CUSTOMER_SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  ADMIN_SESSION_HOURS: z.coerce.number().int().min(1).max(72).default(12),
  COOKIE_DOMAIN: z.string().optional(),
  DEMO_OTP_CODE: z.string().regex(/^\d{6}$/).default('222222'),
  META_PIXEL_ID: z.string().optional(),
  META_CAPI_TOKEN: z.string().optional(),
  META_TEST_EVENT_CODE: z.string().optional(),
  GA4_MEASUREMENT_ID: z.string().optional(),
  GA4_API_SECRET: z.string().optional(),
  SMS_API_URL: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().default('RUPOSHI'),
  // Cloudinary image uploads (empty = upload button hidden, paste-a-URL still works)
  CLOUDINARY_CLOUD_NAME: z.string().regex(/^[\w-]*$/).optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().regex(/^[\w./-]{1,60}$/).default('ruposhi'),
  // shared with the Next.js app: lets the storefront's /api/v1 proxy pass on the visitor's real IP (rate limits, audit log)
  PROXY_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // throw (not process.exit) so the reason shows up in the Vercel function logs as well as the terminal
  throw new Error(`❌ Invalid environment configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
}
const env = parsed.data;

// never boot production with the development secrets
if (env.NODE_ENV === 'production') {
  const weak = (['OTP_SECRET', 'WEBHOOK_SECRET', 'PAYMENT_SECRET', 'JWT_SECRET', 'JWT_ADMIN_SECRET'] as const).filter((k) => /change-me/.test(env[k]) || env[k].length < 32);
  if (weak.length) {
    throw new Error(`❌ Set strong (32+ char) values for: ${weak.join(', ')}  →  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`);
  }
  if (env.PROXY_SECRET && env.PROXY_SECRET.length < 32) throw new Error('❌ PROXY_SECRET must be 32+ characters (or leave it unset).');
}

// links in SMS/emails/order tracking are built from CLIENT_URL — a forgotten value would send customers to localhost
if (env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(env.CLIENT_URL)) {
  console.warn('⚠️  CLIENT_URL still points to localhost — set it to the storefront URL (e.g. https://your-shop.vercel.app) and redeploy.');
}

// Vercel's file system is read-only and every instance starts empty → the JSON demo store cannot work there
if (process.env.VERCEL && env.DATA_SOURCE !== 'mongo') {
  throw new Error('❌ On Vercel set DATA_SOURCE=mongo and MONGODB_URI (the in-memory store needs a writable disk).');
}

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  clientUrl: env.CLIENT_URL,
  corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  dataSource: env.DATA_SOURCE,
  mongoUri: env.MONGODB_URI,
  mongoDb: env.MONGODB_DB,
  demoMode: env.DEMO_MODE === undefined || env.DEMO_MODE === '' ? env.NODE_ENV !== 'production' : env.DEMO_MODE === 'true' || env.DEMO_MODE === '1',
  secrets: {
    otp: env.OTP_SECRET,
    webhook: env.WEBHOOK_SECRET,
    payment: env.PAYMENT_SECRET,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtAdminSecret: env.JWT_ADMIN_SECRET,
    customerSessionMs: env.CUSTOMER_SESSION_DAYS * 864e5,
    adminSessionMs: env.ADMIN_SESSION_HOURS * 36e5,
    cookieDomain: env.COOKIE_DOMAIN || undefined,
    demoOtpCode: env.DEMO_OTP_CODE,
  },
  meta: {
    pixelId: env.META_PIXEL_ID || '',
    capiToken: env.META_CAPI_TOKEN || '',
    testEventCode: env.META_TEST_EVENT_CODE || '',
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: env.CLOUDINARY_API_KEY || '',
    apiSecret: env.CLOUDINARY_API_SECRET || '',
    folder: env.CLOUDINARY_FOLDER.replace(/\/+$/, ''),
    enabled: !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
  },
  ga4: {
    measurementId: env.GA4_MEASUREMENT_ID || '',
    apiSecret: env.GA4_API_SECRET || '',
  },
  proxySecret: env.PROXY_SECRET || '',
  sms: {
    apiUrl: env.SMS_API_URL || '',
    apiKey: env.SMS_API_KEY || '',
    senderId: env.SMS_SENDER_ID,
  },
} as const;

export type AppConfig = typeof config;

import crypto from 'node:crypto';
import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { badRequest, tooMany } from '../lib/errors.js';
import { hmac, id, safeEqual } from '../utils/text.js';
import { sendSms } from './notification.service.js';

const TTL_MS = 5 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

const hashCode = (phone: string, purpose: string, code: string) => hmac(config.secrets.otp, `${phone}:${purpose}:${code}`);

/**
 * Sends a 6-digit OTP. Codes are stored only as HMAC hashes, expire in 5 minutes,
 * allow 5 attempts, have a 60s resend cooldown and an hourly cap per phone.
 * DEMO_MODE uses the fixed code from DEMO_OTP_CODE (222222) and returns it so flows work without an SMS gateway.
 */
export type OtpPurpose = 'checkout' | 'track' | 'register' | 'reset';

export const sendOtp = async (phone: string, purpose: OtpPurpose) => {
  const now = Date.now();
  const recent = await repos.otp.find({ phone, createdAt: { $gte: new Date(now - 3600_000).toISOString() } }, { sort: { createdAt: -1 } });
  if (recent.length >= MAX_PER_HOUR) throw tooMany('Too many codes requested for this number. Please try again later.');
  const last = recent[0];
  if (last && now - new Date(last.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - new Date(last.createdAt).getTime())) / 1000);
    throw tooMany(`Please wait ${wait}s before requesting a new code.`);
  }
  // DEMO_MODE: a fixed, documented code (default 222222) — real SMS + random codes in LIVE mode
  const code = config.demoMode ? config.auth.demoOtpCode : String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const iso = new Date(now).toISOString();
  await repos.otp.insert({
    _id: id('otp'), phone, purpose, codeHash: hashCode(phone, purpose, code), attempts: 0,
    expiresAt: new Date(now + TTL_MS).toISOString(), verified: false, createdAt: iso, updatedAt: iso,
  });
  await sendSms(phone, 'otp', { code });
  return { sent: true, expiresInSec: TTL_MS / 1000, resendInSec: RESEND_COOLDOWN_MS / 1000, ...(config.demoMode ? { demoCode: code } : {}) };
};

export const verifyOtp = async (phone: string, purpose: string, code: string) => {
  const rec = await repos.otp.findOne({ phone, purpose, verified: false, expiresAt: { $gte: new Date().toISOString() } });
  if (!rec) throw badRequest('Code expired or not found. Please request a new one.');
  if (rec.attempts >= MAX_ATTEMPTS) throw tooMany('Too many wrong attempts. Please request a new code.');
  if (!safeEqual(rec.codeHash, hashCode(phone, purpose, code))) {
    await repos.otp.update(rec._id, { attempts: rec.attempts + 1 });
    throw badRequest(`Incorrect code. ${MAX_ATTEMPTS - rec.attempts - 1} attempt(s) left.`);
  }
  await repos.otp.update(rec._id, { verified: true });
  // short-lived proof the client sends with the order (prevents replaying an old verification)
  const exp = Date.now() + 15 * 60_000;
  const token = `${exp}.${hmac(config.secrets.otp, `verified:${phone}:${purpose}:${exp}`)}`;
  return { verified: true, token };
};

export const checkOtpToken = (phone: string, purpose: string, token?: string) => {
  if (!token) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!exp || exp < Date.now() || !sig) return false;
  return safeEqual(sig, hmac(config.secrets.otp, `verified:${phone}:${purpose}:${exp}`));
};

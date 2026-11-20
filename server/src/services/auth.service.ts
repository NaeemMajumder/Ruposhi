import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { badRequest, conflict, forbidden, tooMany, unauthorized } from '../lib/errors.js';
import type { AuthState, Customer, Staff } from '../types/domain.js';
import { id, normalizePhone } from '../utils/text.js';
import { assertStrongPassword, hashPassword, verifyPassword } from '../auth/password.js';
import { checkOtpToken, sendOtp, verifyOtp } from './otp.service.js';
import { audit } from './audit.service.js';

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60_000;
const now = () => new Date().toISOString();
export const normEmail = (e: string) => e.trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const newAuth = async (password: string, phoneVerified: boolean): Promise<AuthState> => ({
  passwordHash: await hashPassword(password),
  tokenVersion: 1,
  failedLogins: 0,
  passwordChangedAt: now(),
  phoneVerified,
});

/** Public view of the signed-in customer (never includes the auth block). */
export const customerSessionView = (c: Customer) => ({
  _id: c._id, name: c.name, email: c.email ?? '', phone: c.phone, phoneVerified: !!c.auth?.phoneVerified,
  memberSince: c.createdAt, loyaltyPoints: c.loyaltyPoints,
});
export const staffSessionView = (s: Staff) => ({ _id: s._id, name: s.name, email: s.email, role: s.role, mustChangePassword: false });

/** Strip auth secrets from any customer/staff document before it leaves the API. */
export const withoutAuth = <T extends { auth?: AuthState }>(doc: T) => {
  const { auth, ...rest } = doc;
  return { ...rest, registered: !!auth };
};

/* ───────────────────────── lockout (shared by customers & staff) ───────────────────────── */

const assertNotLocked = (a?: AuthState) => {
  if (a?.lockedUntil && new Date(a.lockedUntil) > new Date()) {
    const mins = Math.ceil((new Date(a.lockedUntil).getTime() - Date.now()) / 60_000);
    throw tooMany(`Too many wrong passwords. Try again in ${mins} minute(s) or reset your password.`);
  }
};
const failPatch = (a: AuthState): Partial<AuthState> => {
  const failed = a.failedLogins + 1;
  return failed >= MAX_FAILED ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS).toISOString() } : { failedLogins: failed };
};

/* ───────────────────────── customers ───────────────────────── */

/** Finds a REGISTERED account by email or Bangladeshi phone. Guests (no password) can't sign in. */
const findAccount = async (identifier: string) => {
  const raw = identifier.trim();
  if (raw.includes('@')) return repos.customers.findOne({ email: normEmail(raw), auth: { $exists: true } });
  const phone = normalizePhone(raw);
  return phone ? repos.customers.findOne({ phone, auth: { $exists: true } }) : null;
};

export const authenticateCustomer = async (identifier: string, password: string, ip: string) => {
  const c = await findAccount(identifier);
  assertNotLocked(c?.auth);
  const ok = await verifyPassword(password, c?.auth?.passwordHash);
  if (!c || !c.auth || !ok) {
    if (c?.auth) await repos.customers.update(c._id, { auth: { ...c.auth, ...failPatch(c.auth) } });
    throw unauthorized('Email/phone or password is incorrect.');
  }
  if (c.blocked) throw forbidden('This account is suspended. Please contact support.');
  const auth: AuthState = { ...c.auth, failedLogins: 0, lockedUntil: undefined, lastLoginAt: now(), lastLoginIp: ip };
  await repos.customers.update(c._id, { auth });
  return { ...c, auth };
};

export const availability = async (email?: string, phoneRaw?: string) => {
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const [e, p] = await Promise.all([
    email ? repos.customers.findOne({ email: normEmail(email), auth: { $exists: true } }) : null,
    phone ? repos.customers.findOne({ phone, auth: { $exists: true } }) : null,
  ]);
  return { emailTaken: !!e, phoneTaken: !!p };
};

/**
 * Registration: name + email + phone + password, phone proven by OTP.
 * If the phone already has guest orders, that profile is upgraded (order history is kept).
 */
export const registerCustomer = async (input: { name: string; email: string; phone: string; password: string; otpToken: string }) => {
  const phone = normalizePhone(input.phone);
  if (!phone) throw badRequest('Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).');
  const email = normEmail(input.email);
  if (!EMAIL_RE.test(email)) throw badRequest('Please enter a valid email address.');
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2) throw badRequest('Please enter your name.');
  assertStrongPassword(input.password, { email, phone });
  if (!checkOtpToken(phone, 'register', input.otpToken)) throw badRequest('Please verify your phone number with the OTP first.');

  const taken = await availability(email, phone);
  if (taken.phoneTaken) throw conflict('This phone number already has an account. Please sign in or reset your password.');
  if (taken.emailTaken) throw conflict('This email is already registered. Please sign in or use another email.');

  const auth = await newAuth(input.password, true);
  const guest = await repos.customers.findOne({ phone });
  if (guest) {
    const tags = guest.tags.filter((t) => t !== 'guest' && t !== 'new');
    const c = (await repos.customers.update(guest._id, { name, email, auth, tags: [...tags, 'registered'] }))!;
    return c;
  }
  const t = now();
  const c: Customer = {
    _id: id('cus'), name, phone, email, addresses: [], tags: ['registered', 'new'], blocked: false, loyaltyPoints: 0,
    referralCode: `RUP${Math.floor(1000 + Math.random() * 9000)}`, wishlist: [], totalSpent: 0, orderCount: 0, auth, createdAt: t, updatedAt: t,
  };
  await repos.customers.insert(c);
  return c;
};

/** Forgot password → OTP to the registered phone. Same response whether or not the account exists (no enumeration). */
export const requestPasswordReset = async (phoneRaw: string) => {
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw badRequest('Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).');
  const c = await repos.customers.findOne({ phone, auth: { $exists: true } });
  if (!c) return { sent: true, expiresInSec: 300, resendInSec: 60, ...(config.demoMode ? { demoCode: config.auth.demoOtpCode } : {}) };
  return sendOtp(phone, 'reset');
};

export const resetPassword = async (phoneRaw: string, code: string, password: string) => {
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw badRequest('Invalid phone number.');
  const c = await repos.customers.findOne({ phone, auth: { $exists: true } });
  if (!c || !c.auth) throw badRequest('Code expired or not found. Please request a new one.');
  assertStrongPassword(password, { email: c.email, phone }); // before using up the code
  await verifyOtp(phone, 'reset', code);
  const auth: AuthState = { ...c.auth, passwordHash: await hashPassword(password), tokenVersion: c.auth.tokenVersion + 1, failedLogins: 0, lockedUntil: undefined, passwordChangedAt: now(), phoneVerified: true };
  return (await repos.customers.update(c._id, { auth }))!;
};

export const changeCustomerPassword = async (customerId: string, current: string, next: string) => {
  const c = await repos.customers.findById(customerId);
  if (!c?.auth) throw unauthorized();
  assertNotLocked(c.auth);
  if (!(await verifyPassword(current, c.auth.passwordHash))) {
    await repos.customers.update(c._id, { auth: { ...c.auth, ...failPatch(c.auth) } });
    throw badRequest('Your current password is incorrect.');
  }
  if (current === next) throw badRequest('Choose a password different from your current one.');
  assertStrongPassword(next, { email: c.email, phone: c.phone });
  const auth: AuthState = { ...c.auth, passwordHash: await hashPassword(next), tokenVersion: c.auth.tokenVersion + 1, failedLogins: 0, passwordChangedAt: now() };
  return (await repos.customers.update(c._id, { auth }))!;
};

/** Changing the login email needs the current password. */
export const changeCustomerEmail = async (customerId: string, email: string, password: string) => {
  const c = await repos.customers.findById(customerId);
  if (!c?.auth) throw unauthorized();
  const e = normEmail(email);
  if (!EMAIL_RE.test(e)) throw badRequest('Please enter a valid email address.');
  if (e === c.email) return c;
  if (!(await verifyPassword(password, c.auth.passwordHash))) throw badRequest('Your current password is incorrect.');
  const other = await repos.customers.findOne({ email: e, auth: { $exists: true } });
  if (other && other._id !== c._id) throw conflict('This email is already used by another account.');
  return (await repos.customers.update(c._id, { email: e }))!;
};

export const logoutEverywhere = async (customerId: string) => {
  const c = await repos.customers.findById(customerId);
  if (c?.auth) await repos.customers.update(c._id, { auth: { ...c.auth, tokenVersion: c.auth.tokenVersion + 1 } });
};

/* ───────────────────────── staff ───────────────────────── */

export const authenticateStaff = async (emailRaw: string, password: string, ip: string) => {
  const s = await repos.staff.findOne({ email: normEmail(emailRaw) });
  assertNotLocked(s?.auth);
  const ok = await verifyPassword(password, s?.auth?.passwordHash);
  if (!s || !s.auth || !ok) {
    if (s?.auth) await repos.staff.update(s._id, { auth: { ...s.auth, ...failPatch(s.auth) } });
    throw unauthorized('Email or password is incorrect.');
  }
  if (!s.active) throw forbidden('This staff account is disabled. Ask the owner to re-activate it.');
  const auth: AuthState = { ...s.auth, failedLogins: 0, lockedUntil: undefined, lastLoginAt: now(), lastLoginIp: ip };
  const updated = (await repos.staff.update(s._id, { auth, lastLoginAt: auth.lastLoginAt, lastLoginIp: ip }))!;
  await audit({ name: s.name, role: s.role, ip }, 'staff.login', 'staff', s._id, null, { ip });
  return updated;
};

export const setStaffPassword = async (staffId: string, password: string, bump = true) => {
  const s = await repos.staff.findById(staffId);
  if (!s) throw badRequest('Staff not found');
  assertStrongPassword(password, { email: s.email });
  const auth: AuthState = s.auth
    ? { ...s.auth, passwordHash: await hashPassword(password), tokenVersion: s.auth.tokenVersion + (bump ? 1 : 0), failedLogins: 0, lockedUntil: undefined, passwordChangedAt: now() }
    : await newAuth(password, false);
  return (await repos.staff.update(s._id, { auth }))!;
};

export const changeStaffPassword = async (staffId: string, current: string, next: string) => {
  const s = await repos.staff.findById(staffId);
  if (!s?.auth) throw unauthorized();
  if (!(await verifyPassword(current, s.auth.passwordHash))) throw badRequest('Your current password is incorrect.');
  if (current === next) throw badRequest('Choose a password different from your current one.');
  return setStaffPassword(staffId, next);
};

/* ───────────────────────── demo accounts ───────────────────────── */

export const DEMO_CREDENTIALS = {
  customer: { email: 'nusrat@ruposhi.demo', phone: '01711000000', password: 'Demo@1234' },
  staff: [
    { email: 'owner@ruposhi.com.bd', role: 'owner', password: 'Owner@1234' },
    { email: 'rafiq@ruposhi.com.bd', role: 'manager', password: 'Manager@1234' },
    { email: 'shila@ruposhi.com.bd', role: 'order_staff', password: 'Orders@1234' },
    { email: 'mitu@ruposhi.com.bd', role: 'content_editor', password: 'Content@1234' },
  ],
} as const;

/**
 * Gives the demo customer + seeded staff a password if they don't have one yet
 * (fresh seed or an older ./.data folder). In LIVE mode an owner must exist — see README.
 */
export const ensureDemoAccounts = async () => {
  if (!config.demoMode) return;
  const demo = await repos.customers.findById('cus_demo');
  if (demo && !demo.auth) await repos.customers.update(demo._id, { email: DEMO_CREDENTIALS.customer.email, auth: await newAuth(DEMO_CREDENTIALS.customer.password, true) });
  for (const cred of DEMO_CREDENTIALS.staff) {
    const s = await repos.staff.findOne({ email: cred.email });
    if (s && !s.auth) await repos.staff.update(s._id, { auth: await newAuth(cred.password, false) });
  }
};

import bcrypt from 'bcryptjs';
import { badRequest } from '../lib/errors.js';

/** bcrypt work factor — ~250ms per hash on a modern CPU; raise as hardware gets faster. */
const COST = 12;

/** A real hash of a random string, used to equalise timing when an account doesn't exist. */
const DUMMY_HASH = bcrypt.hashSync(`no-such-user-${Math.random()}`, COST);

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);

/** Always runs a full bcrypt comparison (even for unknown users) so response time can't reveal which accounts exist. */
export const verifyPassword = async (plain: string, hash?: string) => {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  return Boolean(hash) && ok;
};

/**
 * Password policy: 8–72 characters (bcrypt reads at most 72 bytes), at least one letter and one number,
 * and not trivially guessable from the account's own email/phone.
 */
export const assertStrongPassword = (pw: string, ctx: { email?: string; phone?: string } = {}) => {
  if (pw.length < 8) throw badRequest('Password must be at least 8 characters.');
  if (Buffer.byteLength(pw, 'utf8') > 72) throw badRequest('Password is too long (max 72 characters).');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw badRequest('Use at least one letter and one number in your password.');
  const lower = pw.toLowerCase();
  const local = ctx.email?.split('@')[0]?.toLowerCase();
  if ((local && local.length >= 4 && lower.includes(local)) || (ctx.phone && lower.includes(ctx.phone.slice(-8))))
    throw badRequest('Your password should not contain your email or phone number.');
  if (/^(password|12345678|qwerty|ruposhi)/i.test(pw)) throw badRequest('This password is too common. Please choose another.');
};

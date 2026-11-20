import { repos } from '../repositories/index.js';
import { badRequest, notFound } from '../lib/errors.js';
import type { Address } from '../types/domain.js';
import { id, normalizePhone } from '../utils/text.js';
import { isValidLocation } from '../data/locations.js';
import { activeFlashSale, toPublic } from './catalog.service.js';
import { toCustomerView } from './order.service.js';
import { getSettings } from './settings.service.js';

const load = async (customerId: string) => {
  const c = await repos.customers.findById(customerId);
  if (!c) throw notFound('Customer');
  return c;
};

export const getProfile = async (customerId: string) => {
  const c = await load(customerId);
  const s = await getSettings();
  return {
    _id: c._id, name: c.name, phone: c.phone, email: c.email, addresses: c.addresses, loyaltyPoints: c.loyaltyPoints,
    loyaltyValue: Math.floor(c.loyaltyPoints * s.loyalty.takaPerPoint), referralCode: c.referralCode, orderCount: c.orderCount,
    totalSpent: c.totalSpent, memberSince: c.createdAt, wishlistCount: c.wishlist.length,
    phoneVerified: !!c.auth?.phoneVerified, passwordChangedAt: c.auth?.passwordChangedAt, lastLoginAt: c.auth?.lastLoginAt,
  };
};

export const updateProfile = async (customerId: string, data: { name?: string }) => {
  await load(customerId);
  const patch: Record<string, string> = {};
  if (data.name) patch.name = data.name.trim().replace(/\s+/g, ' ');
  if (Object.keys(patch).length) await repos.customers.update(customerId, patch);
  return getProfile(customerId);
};

export const myOrders = async (customerId: string, status?: string) => {
  const filter: Record<string, unknown> = { customerId };
  if (status && status !== 'all') filter.status = status;
  const orders = await repos.orders.find(filter, { sort: { createdAt: -1 } });
  return orders.map(toCustomerView);
};

export const myOrder = async (customerId: string, orderNo: string) => {
  const o = await repos.orders.findOne({ customerId, orderNo });
  if (!o) throw notFound('Order');
  return toCustomerView(o);
};

export const addAddress = async (customerId: string, a: Address & { label: string; isDefault?: boolean }) => {
  const c = await load(customerId);
  if (!isValidLocation(a.division, a.district, a.area)) throw badRequest('Invalid delivery area.');
  if (c.addresses.length >= 6) throw badRequest('You can save up to 6 addresses.');
  const entry = { ...a, id: id('adr'), isDefault: !!a.isDefault || c.addresses.length === 0 };
  const addresses = (entry.isDefault ? c.addresses.map((x) => ({ ...x, isDefault: false })) : c.addresses).concat(entry);
  await repos.customers.update(customerId, { addresses });
  return addresses;
};

export const updateAddress = async (customerId: string, addressId: string, a: Partial<Address & { label: string; isDefault: boolean }>) => {
  const c = await load(customerId);
  if (!c.addresses.some((x) => x.id === addressId)) throw notFound('Address');
  let addresses = c.addresses.map((x) => (x.id === addressId ? { ...x, ...a } : x));
  if (a.isDefault) addresses = addresses.map((x) => ({ ...x, isDefault: x.id === addressId }));
  await repos.customers.update(customerId, { addresses });
  return addresses;
};

export const deleteAddress = async (customerId: string, addressId: string) => {
  const c = await load(customerId);
  let addresses = c.addresses.filter((x) => x.id !== addressId);
  if (addresses.length && !addresses.some((x) => x.isDefault)) addresses = addresses.map((x, i) => ({ ...x, isDefault: i === 0 }));
  await repos.customers.update(customerId, { addresses });
  return addresses;
};

export const getWishlist = async (customerId: string) => {
  const c = await load(customerId);
  const [products, sale] = await Promise.all([repos.products.find({ _id: { $in: c.wishlist } }), activeFlashSale()]);
  return products.map((p) => toPublic(p, sale));
};

export const toggleWishlist = async (customerId: string, productId: string, add: boolean) => {
  const c = await load(customerId);
  const exists = await repos.products.findById(productId);
  if (!exists) throw notFound('Product');
  const set = new Set(c.wishlist);
  if (add) set.add(productId);
  else set.delete(productId);
  await repos.customers.update(customerId, { wishlist: [...set] });
  return [...set];
};

/** Lightweight lookup used by the OTP "login" demo — finds or creates a customer by phone. */
export const findOrCreateByPhone = async (phoneRaw: string) => {
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw badRequest('Invalid phone number.');
  const existing = await repos.customers.findOne({ phone });
  if (existing) return existing;
  const now = new Date().toISOString();
  const c = {
    _id: id('cus'), name: 'Ruposhi Customer', phone, addresses: [], tags: ['new'], blocked: false, loyaltyPoints: 0,
    referralCode: `RUP${Math.floor(1000 + Math.random() * 9000)}`, wishlist: [], totalSpent: 0, orderCount: 0, createdAt: now, updatedAt: now,
  };
  await repos.customers.insert(c);
  return c;
};

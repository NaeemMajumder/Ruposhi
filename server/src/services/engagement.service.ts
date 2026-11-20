import { repos } from '../repositories/index.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { id, normalizePhone } from '../utils/text.js';

const now = () => new Date().toISOString();

/* ---------------- reviews ---------------- */
export const listReviews = async (slug: string, page = 1, limit = 10, sort: 'newest' | 'highest' | 'lowest' | 'photos' = 'newest') => {
  const p = await repos.products.findOne({ slug });
  if (!p) throw notFound('Product');
  let all = await repos.reviews.find({ productId: p._id, status: 'approved' }, { sort: { createdAt: -1 } });
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({ star, count: all.filter((r) => r.rating === star).length }));
  if (sort === 'highest') all = all.sort((a, b) => b.rating - a.rating);
  if (sort === 'lowest') all = all.sort((a, b) => a.rating - b.rating);
  if (sort === 'photos') all = all.filter((r) => r.photos.length);
  const items = all.slice((page - 1) * limit, page * limit).map(({ customerId: _c, orderNo: _o, ...r }) => r);
  return { items, total: all.length, average: p.rating, count: p.reviewCount, breakdown };
};

/** Only customers who bought the product (verified by order no + phone) get the "verified" badge. */
export const createReview = async (slug: string, input: { name: string; phone: string; orderNo?: string; rating: number; title: string; body: string }) => {
  const p = await repos.products.findOne({ slug });
  if (!p) throw notFound('Product');
  const phone = normalizePhone(input.phone);
  if (!phone) throw badRequest('Invalid phone number.');
  const order = input.orderNo ? await repos.orders.findOne({ orderNo: input.orderNo.toUpperCase(), 'customer.phone': phone, 'items.slug': slug }) : null;
  const verified = !!order && order.status === 'delivered';
  const t = now();
  const review = {
    _id: id('rev'), productId: p._id, productSlug: slug, customerName: input.name.trim(), orderNo: order?.orderNo,
    rating: input.rating, title: input.title.trim(), body: input.body.trim(), photos: [], verified, status: 'pending' as const, createdAt: t, updatedAt: t,
  };
  await repos.reviews.insert(review);
  return { submitted: true, verified, message: 'Thank you! Your review will appear after moderation.' };
};

export const recomputeRating = async (productId: string) => {
  const approved = await repos.reviews.find({ productId, status: 'approved' });
  if (!approved.length) return;
  const avg = approved.reduce((s, r) => s + r.rating, 0) / approved.length;
  const p = await repos.products.findById(productId);
  if (p) await repos.products.update(productId, { rating: Math.round(avg * 10) / 10, reviewCount: Math.max(p.reviewCount, approved.length) });
};

/* ---------------- newsletter / contact ---------------- */
export const subscribe = async (contact: string, source: string) => {
  const c = contact.trim().toLowerCase();
  const phone = normalizePhone(c);
  const value = phone ?? c;
  if (!phone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) throw badRequest('Enter a valid email or phone number.');
  if (await repos.subscribers.findOne({ contact: value })) throw conflict('You are already subscribed. Thank you!');
  const t = now();
  await repos.subscribers.insert({ _id: id('sub'), contact: value, source, createdAt: t, updatedAt: t });
  return { subscribed: true };
};

export const contact = async (input: { name: string; phone: string; email?: string; subject: string; message: string }) => {
  const phone = normalizePhone(input.phone);
  if (!phone) throw badRequest('Invalid phone number.');
  const t = now();
  await repos.contacts.insert({ _id: id('msg'), ...input, phone, status: 'new', createdAt: t, updatedAt: t });
  return { received: true };
};

/* ---------------- back-in-stock ---------------- */
export const notifyMe = async (slug: string, phoneRaw: string, size?: string, color?: string) => {
  const phone = normalizePhone(phoneRaw);
  if (!phone) throw badRequest('Invalid phone number.');
  if (!(await repos.products.findOne({ slug }))) throw notFound('Product');
  if (await repos.stockAlerts.findOne({ productSlug: slug, phone, size, notified: false })) return { subscribed: true };
  const t = now();
  await repos.stockAlerts.insert({ _id: id('stk'), productSlug: slug, phone, size, color, notified: false, createdAt: t, updatedAt: t });
  return { subscribed: true };
};

/* ---------------- abandoned carts ---------------- */
export const saveAbandonedCart = async (input: { phone: string; name?: string; items: { slug: string; name: string; qty: number; price: number; size: string; color: string }[] }) => {
  const phone = normalizePhone(input.phone);
  if (!phone || !input.items.length) return { saved: false };
  const value = input.items.reduce((s, i) => s + i.price * i.qty, 0);
  const existing = await repos.abandonedCarts.findOne({ phone, recovered: false });
  if (existing) {
    await repos.abandonedCarts.update(existing._id, { items: input.items, value, name: input.name ?? existing.name });
    return { saved: true };
  }
  const t = now();
  await repos.abandonedCarts.insert({ _id: id('abc'), phone, name: input.name, items: input.items, value, recovered: false, remindersSent: 0, createdAt: t, updatedAt: t });
  return { saved: true };
};

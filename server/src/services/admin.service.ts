import { repos } from '../repositories/index.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { dateRange } from '../lib/http.js';
import type {
  Category, Cms, Coupon, Customer, FlashSale, Order, OrderStatus, Product, Settings, Staff,
} from '../types/domain.js';
import { escapeRegex, id, normalizePhone, slugify } from '../utils/text.js';
import { setStaffPassword, withoutAuth } from './auth.service.js';
import { assertStrongPassword } from '../auth/password.js';
import { audit, type Actor } from './audit.service.js';
import { totalStock } from './catalog.service.js';
import { recomputeRating } from './engagement.service.js';
import { sendSms } from './notification.service.js';
import { adjustStock, allowedNext, changeStatus, fraudCheck } from './order.service.js';
import { getSettings } from './settings.service.js';

const now = () => new Date().toISOString();
const rx = (q: string) => ({ $regex: escapeRegex(q.trim()), $options: 'i' });
const page = <T,>(rows: T[], p = 1, limit = 20) => ({ items: rows.slice((p - 1) * limit, p * limit), total: rows.length, page: p, limit, pages: Math.max(1, Math.ceil(rows.length / limit)) });
const withinDates = (from?: string, to?: string, field = 'createdAt') => {
  if (!from && !to) return {};
  const { startIso, endIso } = dateRange(from, to, 3650);
  return { [field]: { $gte: startIso, $lte: endIso } };
};

/* ═════════════════════════ ORDERS ═════════════════════════ */

export interface OrderFilters {
  q?: string; status?: string; paymentMethod?: string; paymentStatus?: string; district?: string; channel?: string;
  courier?: string; risk?: string; from?: string; to?: string; sort?: string; page?: number; limit?: number;
}

export const listOrders = async (f: OrderFilters) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.paymentMethod) filter['payment.method'] = { $in: f.paymentMethod.split(',') };
  if (f.paymentStatus) filter['payment.status'] = { $in: f.paymentStatus.split(',') };
  if (f.district) filter['shippingAddress.district'] = { $in: f.district.split(',') };
  if (f.channel) filter['source.channel'] = { $in: f.channel.split(',') };
  if (f.courier) filter['shipping.courier'] = { $in: f.courier.split(',') };
  if (f.risk) filter['flags.fraudRisk'] = { $in: f.risk.split(',') };
  if (f.q) filter.$or = [{ orderNo: rx(f.q) }, { 'customer.name': rx(f.q) }, { 'customer.phone': rx(f.q) }, { 'shipping.consignmentId': rx(f.q) }, { 'payment.trxId': rx(f.q) }];

  const base = await repos.orders.find(filter);
  const counts = base.reduce<Record<string, number>>((m, o) => ((m[o.status] = (m[o.status] ?? 0) + 1), m), { all: base.length });
  let rows = f.status && f.status !== 'all' ? base.filter((o) => f.status!.split(',').includes(o.status)) : base;
  const [field, dir] = (f.sort ?? 'createdAt:desc').split(':');
  const val = (o: Order) => (field === 'total' ? o.pricing.total : field === 'customer' ? o.customer.name : o.createdAt);
  rows = rows.sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1);
  });
  const result = page(rows, f.page, Math.min(f.limit ?? 20, 200));
  return { ...result, counts, totals: { revenue: rows.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.pricing.total, 0) } };
};

export const orderRows = (orders: Order[]) =>
  orders.map((o) => ({
    orderNo: o.orderNo, date: o.createdAt.slice(0, 16).replace('T', ' '), status: o.status, customer: o.customer.name, phone: o.customer.phone,
    division: o.shippingAddress.division, district: o.shippingAddress.district, area: o.shippingAddress.area, address: o.shippingAddress.address,
    items: o.items.map((i) => `${i.name.en} (${i.size}) x${i.qty}`).join('; '), subtotal: o.pricing.subtotal, discount: o.pricing.discount,
    coupon: o.pricing.couponCode ?? '', delivery: o.pricing.deliveryCharge, total: o.pricing.total, paymentMethod: o.payment.method,
    paymentStatus: o.payment.status, trxId: o.payment.trxId ?? '', courier: o.shipping.courier ?? '', consignmentId: o.shipping.consignmentId ?? '',
    channel: o.source.channel, campaign: o.source.utm_campaign ?? '', risk: o.flags.fraudRisk,
  }));

export const getOrder = async (orderId: string) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  const [fraud, sms] = await Promise.all([fraudCheck(o.customer.phone), repos.smsLogs.find({ to: o.customer.phone }, { sort: { createdAt: -1 }, limit: 10 })]);
  return { order: o, fraud, allowedNext: allowedNext(o.status), sms };
};

export const addOrderNote = async (orderId: string, text: string, actor: Actor) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  const notes = [...o.notes, { text: text.trim(), by: actor.name, at: now() }];
  await repos.orders.update(orderId, { notes });
  return notes;
};

export const bulkStatus = async (ids: string[], status: OrderStatus, actor: Actor) => {
  const results = { updated: 0, failed: [] as { id: string; error: string }[] };
  for (const oid of ids.slice(0, 200)) {
    try {
      await changeStatus(oid, status, actor);
      results.updated++;
    } catch (e) {
      results.failed.push({ id: oid, error: (e as Error).message });
    }
  }
  return results;
};

/** Edit quantities / remove items before shipping. Stock and totals are adjusted. */
export const editOrderItems = async (orderId: string, items: { sku: string; qty: number }[], actor: Actor) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  if (!['pending', 'confirmed', 'processing'].includes(o.status)) throw badRequest('Items can only be edited before the order ships.');
  const next = o.items
    .map((i) => {
      const change = items.find((x) => x.sku === i.sku);
      return change ? { ...i, qty: Math.max(0, Math.min(10, Math.floor(change.qty))) } : i;
    });
  for (const i of o.items) {
    const n = next.find((x) => x.sku === i.sku)!;
    const delta = i.qty - n.qty; // positive = return to stock
    if (delta !== 0) {
      if (delta < 0) {
        const p = await repos.products.findOne({ slug: i.slug });
        const v = p?.variants.find((x) => x.sku === i.sku);
        if (!v || v.stock < -delta) throw conflict(`Not enough stock for ${i.name.en} (${i.size}).`);
      }
      await adjustStock(i.slug, i.sku, delta, 'order_edit', actor.name, o.orderNo);
    }
  }
  const kept = next.filter((i) => i.qty > 0).map((i) => ({ ...i, lineTotal: i.price * i.qty }));
  if (!kept.length) throw badRequest('An order needs at least one item. Cancel the order instead.');
  const subtotal = kept.reduce((s, i) => s + i.lineTotal, 0);
  const discount = Math.min(o.pricing.discount, subtotal);
  const total = subtotal - discount + o.pricing.deliveryCharge + o.pricing.giftWrap;
  const pricing = { ...o.pricing, subtotal, discount, total, due: Math.max(0, total - o.payment.paidAmount) };
  const updated = await repos.orders.update(orderId, { items: kept, pricing, timeline: [...o.timeline, { status: 'edited', at: now(), by: actor.name, note: 'Items updated' }] });
  await audit(actor, 'order.items_edited', 'order', orderId, { items: o.items.map((i) => `${i.sku}x${i.qty}`), total: o.pricing.total }, { items: kept.map((i) => `${i.sku}x${i.qty}`), total });
  return updated;
};

export const setCallConfirmed = async (orderId: string, value: boolean, actor: Actor) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  await repos.orders.update(orderId, { flags: { ...o.flags, callConfirmed: value } });
  await audit(actor, 'order.call_confirmed', 'order', orderId, { callConfirmed: o.flags.callConfirmed }, { callConfirmed: value });
  return { callConfirmed: value };
};

/* ═════════════════════════ PRODUCTS ═════════════════════════ */

export interface ProductFilters { q?: string; category?: string; status?: string; stock?: 'in' | 'low' | 'out'; featured?: boolean; sort?: string; page?: number; limit?: number }

export const adminListProducts = async (f: ProductFilters) => {
  const filter: Record<string, unknown> = {};
  if (f.category) filter.category = { $in: f.category.split(',') };
  if (f.status) filter.status = { $in: f.status.split(',') };
  if (f.featured !== undefined) filter.isFeatured = f.featured;
  if (f.q) filter.$or = [{ 'name.en': rx(f.q) }, { 'name.bn': rx(f.q) }, { sku: rx(f.q) }, { slug: rx(f.q) }, { 'variants.sku': rx(f.q) }];
  const settings = await getSettings();
  let rows = await repos.products.find(filter);
  if (f.stock) rows = rows.filter((p) => {
    const s = totalStock(p);
    return f.stock === 'out' ? s === 0 : f.stock === 'low' ? s > 0 && p.variants.some((v) => v.stock <= settings.lowStockThreshold) : s > 0;
  });
  const [field, dir] = (f.sort ?? 'createdAt:desc').split(':');
  const val = (p: Product) => (field === 'price' ? p.price : field === 'stock' ? totalStock(p) : field === 'sold' ? p.soldCount : field === 'name' ? p.name.en : p.createdAt);
  rows.sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1);
  });
  const result = page(rows, f.page, Math.min(f.limit ?? 20, 200));
  return { ...result, items: result.items.map((p) => ({ ...p, totalStock: totalStock(p) })) };
};

export const getProductAdmin = async (productId: string) => {
  const p = await repos.products.findById(productId);
  if (!p) throw notFound('Product');
  return p;
};

export type ProductInput = Omit<Product, '_id' | 'createdAt' | 'updatedAt' | 'rating' | 'reviewCount' | 'soldCount' | 'viewCount'> & Partial<Pick<Product, 'rating' | 'reviewCount' | 'soldCount'>>;

const assertSkusUnique = async (p: { sku: string; variants: { sku: string }[] }, ignoreId?: string) => {
  const skus = p.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) throw badRequest('Variant SKUs must be unique.');
  const clash = await repos.products.findOne({ $or: [{ sku: p.sku }, { 'variants.sku': { $in: skus } }], ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) });
  if (clash) throw conflict(`SKU already used by "${clash.name.en}".`);
};

export const createProduct = async (input: ProductInput, actor: Actor) => {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name.en);
  if (await repos.products.findOne({ slug })) throw conflict('A product with this URL slug already exists.');
  await assertSkusUnique(input);
  const t = now();
  const doc: Product = { ...input, slug, rating: 0, reviewCount: 0, soldCount: 0, viewCount: 0, _id: id('prd'), createdAt: t, updatedAt: t } as Product;
  await repos.products.insert(doc);
  await audit(actor, 'product.created', 'product', doc._id, null, { slug, price: doc.price });
  return doc;
};

export const updateProduct = async (productId: string, input: Partial<ProductInput>, actor: Actor) => {
  const p = await repos.products.findById(productId);
  if (!p) throw notFound('Product');
  if (!input.slug) delete input.slug; // empty/missing slug = keep the current one
  if (input.slug && slugify(input.slug) !== p.slug) {
    const slug = slugify(input.slug);
    if (await repos.products.findOne({ slug, _id: { $ne: productId } })) throw conflict('Slug already in use.');
    input.slug = slug;
  }
  if (input.variants || input.sku) await assertSkusUnique({ sku: input.sku ?? p.sku, variants: input.variants ?? p.variants }, productId);
  const updated = await repos.products.update(productId, input as Partial<Product>);
  const changed = Object.keys(input).filter((k) => JSON.stringify((p as unknown as Record<string, unknown>)[k]) !== JSON.stringify((input as Record<string, unknown>)[k]));
  if (changed.length) {
    await audit(
      actor,
      changed.includes('price') ? 'product.price_changed' : 'product.updated',
      'product',
      productId,
      Object.fromEntries(changed.map((k) => [k, (p as unknown as Record<string, unknown>)[k]])),
      Object.fromEntries(changed.map((k) => [k, (input as Record<string, unknown>)[k]])),
    );
  }
  return updated;
};

export const archiveProduct = async (productId: string, actor: Actor) => {
  const p = await repos.products.findById(productId);
  if (!p) throw notFound('Product');
  await repos.products.update(productId, { status: 'archived' });
  await audit(actor, 'product.archived', 'product', productId, { status: p.status }, { status: 'archived' });
  return { archived: true };
};

export const duplicateProduct = async (productId: string, actor: Actor) => {
  const p = await repos.products.findById(productId);
  if (!p) throw notFound('Product');
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const t = now();
  const copy: Product = {
    ...p, _id: id('prd'), slug: `${p.slug}-copy-${suffix.toLowerCase()}`, sku: `${p.sku}-${suffix}`, status: 'draft',
    name: { en: `${p.name.en} (Copy)`, bn: `${p.name.bn} (কপি)` }, variants: p.variants.map((v) => ({ ...v, sku: `${v.sku}-${suffix}`, stock: 0 })),
    soldCount: 0, viewCount: 0, reviewCount: 0, rating: 0, createdAt: t, updatedAt: t,
  };
  await repos.products.insert(copy);
  await audit(actor, 'product.duplicated', 'product', copy._id, { from: p._id }, { slug: copy.slug });
  return copy;
};

export const bulkPrice = async (input: { category?: string; productIds?: string[]; percent: number; field: 'price' | 'compareAtPrice' }, actor: Actor) => {
  if (Math.abs(input.percent) > 90) throw badRequest('Change must be between -90% and +90%.');
  const filter: Record<string, unknown> = {};
  if (input.category) filter.category = input.category;
  if (input.productIds?.length) filter._id = { $in: input.productIds };
  const products = await repos.products.find(filter);
  const round = (n: number) => Math.max(0, Math.round(n / 10) * 10);
  for (const p of products) {
    const cur = input.field === 'price' ? p.price : p.compareAtPrice ?? p.price;
    const next = round(cur * (1 + input.percent / 100));
    await repos.products.update(p._id, { [input.field]: next } as Partial<Product>);
    await audit(actor, 'product.price_changed', 'product', p._id, { [input.field]: cur }, { [input.field]: next, bulk: `${input.percent}%` });
  }
  return { updated: products.length };
};

/* ═════════════════════════ CATEGORIES ═════════════════════════ */

export const upsertCategory = async (input: Omit<Category, '_id' | 'createdAt' | 'updatedAt'>, actor: Actor, categoryId?: string) => {
  const slug = slugify(input.slug || input.name.en);
  const clash = await repos.categories.findOne({ slug, ...(categoryId ? { _id: { $ne: categoryId } } : {}) });
  if (clash) throw conflict('Category slug already exists.');
  if (categoryId) {
    const before = await repos.categories.findById(categoryId);
    if (!before) throw notFound('Category');
    const updated = await repos.categories.update(categoryId, { ...input, slug });
    await audit(actor, 'category.updated', 'category', categoryId, before, updated);
    return updated;
  }
  const t = now();
  const doc = { ...input, slug, _id: id('cat'), createdAt: t, updatedAt: t };
  await repos.categories.insert(doc);
  await audit(actor, 'category.created', 'category', doc._id, null, { slug });
  return doc;
};

export const deleteCategory = async (categoryId: string, actor: Actor) => {
  const c = await repos.categories.findById(categoryId);
  if (!c) throw notFound('Category');
  if (await repos.products.count({ category: c.slug, status: { $ne: 'archived' } })) throw conflict('Move or archive the products in this category first.');
  await repos.categories.delete(categoryId);
  await audit(actor, 'category.deleted', 'category', categoryId, c, null);
  return { deleted: true };
};

/* ═════════════════════════ INVENTORY ═════════════════════════ */

export const inventoryList = async (f: { q?: string; category?: string; stock?: string; page?: number; limit?: number }) => {
  const settings = await getSettings();
  const products = await repos.products.find(f.category ? { category: { $in: f.category.split(',') } } : {});
  let rows = products.flatMap((p) => p.variants.map((v) => ({
    productId: p._id, slug: p.slug, name: p.name.en, image: p.images[0]?.url, category: p.category, sku: v.sku, color: v.color, size: v.size, stock: v.stock,
    value: v.stock * p.costPrice, status: v.stock === 0 ? 'out' : v.stock <= settings.lowStockThreshold ? 'low' : 'in', preOrder: p.preOrder,
  })));
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
  }
  if (f.stock) rows = rows.filter((r) => f.stock!.split(',').includes(r.status));
  rows.sort((a, b) => a.stock - b.stock);
  const summary = {
    skus: rows.length, units: rows.reduce((s, r) => s + r.stock, 0), stockValue: rows.reduce((s, r) => s + r.value, 0),
    low: rows.filter((r) => r.status === 'low').length, out: rows.filter((r) => r.status === 'out').length,
  };
  return { ...page(rows, f.page, Math.min(f.limit ?? 50, 500)), summary };
};

export const inventoryAdjust = async (input: { slug: string; sku: string; change: number; reason: string; ref?: string }, actor: Actor) => {
  if (!Number.isInteger(input.change) || input.change === 0) throw badRequest('Change must be a non-zero whole number.');
  const r = await adjustStock(input.slug, input.sku, input.change, input.reason, actor.name, input.ref);
  await audit(actor, 'inventory.adjusted', 'variant', input.sku, { stock: r.before }, { stock: r.after, reason: input.reason });
  return r;
};

export const inventoryLogs = async (f: { q?: string; reason?: string; from?: string; to?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.reason) filter.reason = { $in: f.reason.split(',') };
  if (f.q) filter.$or = [{ sku: rx(f.q) }, { productSlug: rx(f.q) }, { ref: rx(f.q) }];
  const rows = await repos.inventoryLogs.find(filter, { sort: { createdAt: -1 } });
  return page(rows, f.page, Math.min(f.limit ?? 30, 500));
};

/* ═════════════════════════ CUSTOMERS ═════════════════════════ */

export const listCustomers = async (f: { q?: string; tag?: string; blocked?: boolean; minSpent?: number; maxSpent?: number; minOrders?: number; from?: string; to?: string; sort?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.tag) filter.tags = { $in: f.tag.split(',') };
  if (f.blocked !== undefined) filter.blocked = f.blocked;
  if (f.minSpent != null || f.maxSpent != null) filter.totalSpent = { ...(f.minSpent != null ? { $gte: f.minSpent } : {}), ...(f.maxSpent != null ? { $lte: f.maxSpent } : {}) };
  if (f.minOrders != null) filter.orderCount = { $gte: f.minOrders };
  if (f.q) filter.$or = [{ name: rx(f.q) }, { phone: rx(f.q) }, { email: rx(f.q) }];
  const rows = await repos.customers.find(filter);
  const [field, dir] = (f.sort ?? 'totalSpent:desc').split(':');
  rows.sort((a, b) => {
    const x = (a as unknown as Record<string, string | number>)[field] ?? '';
    const y = (b as unknown as Record<string, string | number>)[field] ?? '';
    return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1);
  });
  return page(rows.map(withoutAuth), f.page, Math.min(f.limit ?? 20, 500));
};

export const customerRows = (cs: (Omit<Customer, 'auth'> & { registered?: boolean })[]) =>
  cs.map((c) => ({
    name: c.name, phone: c.phone, email: c.email ?? '', orders: c.orderCount, totalSpent: c.totalSpent, loyaltyPoints: c.loyaltyPoints,
    account: c.registered ? 'registered' : 'guest', tags: c.tags.join(', '), blocked: c.blocked ? 'yes' : 'no', district: c.addresses[0]?.district ?? '', joined: c.createdAt.slice(0, 10), lastOrder: c.lastOrderAt?.slice(0, 10) ?? '',
  }));

export const getCustomerAdmin = async (customerId: string) => {
  const c = await repos.customers.findById(customerId);
  if (!c) throw notFound('Customer');
  const [orders, fraud] = await Promise.all([repos.orders.find({ customerId }, { sort: { createdAt: -1 } }), fraudCheck(c.phone)]);
  return { customer: withoutAuth(c), orders: orders.map((o) => ({ _id: o._id, orderNo: o.orderNo, status: o.status, total: o.pricing.total, createdAt: o.createdAt })), fraud };
};

export const updateCustomerAdmin = async (customerId: string, input: { tags?: string[]; blocked?: boolean; notes?: string; name?: string }, actor: Actor) => {
  const c = await repos.customers.findById(customerId);
  if (!c) throw notFound('Customer');
  const updated = await repos.customers.update(customerId, input);
  // blocking a customer also signs them out everywhere
  if (input.blocked && c.auth) await repos.customers.update(customerId, { auth: { ...c.auth, tokenVersion: c.auth.tokenVersion + 1 } });
  await audit(actor, input.blocked !== undefined && input.blocked !== c.blocked ? (input.blocked ? 'customer.blocked' : 'customer.unblocked') : 'customer.updated', 'customer', customerId, { tags: c.tags, blocked: c.blocked }, input);
  return updated;
};

/* ═════════════════════════ COUPONS / FLASH SALES ═════════════════════════ */

export const upsertCoupon = async (input: Omit<Coupon, '_id' | 'createdAt' | 'updatedAt' | 'usedCount'>, actor: Actor, couponId?: string) => {
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(code)) throw badRequest('Code must be 3–20 letters/numbers.');
  if (input.type === 'percent' && (input.value <= 0 || input.value > 90)) throw badRequest('Percent must be between 1 and 90.');
  const clash = await repos.coupons.findOne({ code, ...(couponId ? { _id: { $ne: couponId } } : {}) });
  if (clash) throw conflict('Coupon code already exists.');
  if (couponId) {
    const before = await repos.coupons.findById(couponId);
    if (!before) throw notFound('Coupon');
    const u = await repos.coupons.update(couponId, { ...input, code });
    await audit(actor, 'coupon.updated', 'coupon', couponId, before, u);
    return u;
  }
  const t = now();
  const doc = { ...input, code, usedCount: 0, _id: id('cpn'), createdAt: t, updatedAt: t };
  await repos.coupons.insert(doc);
  await audit(actor, 'coupon.created', 'coupon', doc._id, null, { code });
  return doc;
};

export const upsertFlashSale = async (input: Omit<FlashSale, '_id' | 'createdAt' | 'updatedAt'>, actor: Actor, saleId?: string) => {
  if (input.endsAt <= input.startsAt) throw badRequest('End time must be after start time.');
  if (saleId) {
    const u = await repos.flashSales.update(saleId, input);
    if (!u) throw notFound('Flash sale');
    await audit(actor, 'flash_sale.updated', 'flashSale', saleId, null, input);
    return u;
  }
  const t = now();
  const doc = { ...input, _id: id('fls'), createdAt: t, updatedAt: t };
  await repos.flashSales.insert(doc);
  await audit(actor, 'flash_sale.created', 'flashSale', doc._id, null, input);
  return doc;
};

/* ═════════════════════════ REVIEWS ═════════════════════════ */

export const listReviewsAdmin = async (f: { status?: string; rating?: number; q?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = {};
  if (f.status) filter.status = { $in: f.status.split(',') };
  if (f.rating) filter.rating = f.rating;
  if (f.q) filter.$or = [{ customerName: rx(f.q) }, { productSlug: rx(f.q) }, { body: rx(f.q) }];
  const rows = await repos.reviews.find(filter, { sort: { createdAt: -1 } });
  return page(rows, f.page, f.limit ?? 20);
};

export const moderateReview = async (reviewId: string, input: { status?: 'approved' | 'hidden' | 'pending'; reply?: string }, actor: Actor) => {
  const r = await repos.reviews.findById(reviewId);
  if (!r) throw notFound('Review');
  const u = await repos.reviews.update(reviewId, input);
  await recomputeRating(r.productId);
  await audit(actor, 'review.moderated', 'review', reviewId, { status: r.status }, input);
  return u;
};

/* ═════════════════════════ CMS / SETTINGS / STAFF ═════════════════════════ */

export const updateCms = async (input: Partial<Cms>, actor: Actor) => {
  const before = await repos.cms.findById('cms');
  const u = await repos.cms.update('cms', input);
  await audit(actor, 'cms.updated', 'cms', 'cms', { sections: Object.keys(input) }, null);
  void before;
  return u;
};

export const updateSettings = async (input: Partial<Settings>, actor: Actor) => {
  const before = await getSettings();
  const merged: Partial<Settings> = {};
  for (const k of Object.keys(input) as (keyof Settings)[]) {
    const v = input[k];
    (merged as Record<string, unknown>)[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(before[k] as object), ...(v as object) } : v;
  }
  const u = await repos.settings.update('settings', merged);
  await audit(actor, 'settings.updated', 'settings', 'settings', Object.fromEntries(Object.keys(input).map((k) => [k, before[k as keyof Settings]])), input);
  return u;
};

export const listStaff = async () => (await repos.staff.find({}, { sort: { createdAt: 1 } })).map(withoutAuth);

export const upsertStaff = async (input: Pick<Staff, 'name' | 'email' | 'role' | 'active'> & { password?: string }, actor: Actor & { id?: string }, staffId?: string) => {
  const { password, ...data } = input;
  data.email = data.email.trim().toLowerCase();
  if (staffId) {
    const before = await repos.staff.findById(staffId);
    if (!before) throw notFound('Staff');
    const losesOwner = before.role === 'owner' && before.active && (data.role !== 'owner' || !data.active);
    if (losesOwner && (await repos.staff.count({ role: 'owner', active: true })) <= 1) throw badRequest('The store needs at least one active owner.');
    if (staffId === actor.id && !data.active) throw badRequest('You cannot deactivate your own account.');
    const dupe = await repos.staff.findOne({ email: data.email });
    if (dupe && dupe._id !== staffId) throw conflict('A staff member with this email exists.');
    await repos.staff.update(staffId, data);
    // a role change, deactivation or new password signs that person out everywhere
    if (password) await setStaffPassword(staffId, password);
    else if (before.auth && (before.role !== data.role || (before.active && !data.active)))
      await repos.staff.update(staffId, { auth: { ...before.auth, tokenVersion: before.auth.tokenVersion + 1 } });
    await audit(actor, 'staff.updated', 'staff', staffId, { role: before.role, active: before.active, email: before.email }, { role: data.role, active: data.active, email: data.email, passwordReset: !!password });
    return withoutAuth((await repos.staff.findById(staffId))!);
  }
  if (!password) throw badRequest('Set an initial password for the new staff member.');
  assertStrongPassword(password, { email: data.email });
  if (await repos.staff.findOne({ email: data.email })) throw conflict('A staff member with this email exists.');
  const t = now();
  const doc: Staff = { ...data, _id: id('stf'), ordersHandled: 0, createdAt: t, updatedAt: t };
  await repos.staff.insert(doc);
  await setStaffPassword(doc._id, password, false);
  await audit(actor, 'staff.created', 'staff', doc._id, null, { name: doc.name, role: doc.role });
  return withoutAuth((await repos.staff.findById(doc._id))!);
};

/* ═════════════════════════ MARKETING ═════════════════════════ */

export const abandonedList = async (f: { recovered?: boolean; from?: string; to?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.recovered !== undefined) filter.recovered = f.recovered;
  const rows = await repos.abandonedCarts.find(filter, { sort: { createdAt: -1 } });
  return { ...page(rows, f.page, f.limit ?? 20), summary: { count: rows.length, value: rows.reduce((s, r) => s + r.value, 0), recovered: rows.filter((r) => r.recovered).length } };
};

export const remindAbandoned = async (cartId: string, actor: Actor) => {
  const c = await repos.abandonedCarts.findById(cartId);
  if (!c) throw notFound('Cart');
  if (c.recovered) throw badRequest('This cart was already recovered.');
  const r = await sendSms(c.phone, 'abandoned_cart', { name: c.name ?? 'there', cartUrl: 'https://ruposhi.com.bd/cart' });
  await repos.abandonedCarts.update(cartId, { remindersSent: c.remindersSent + 1, lastReminderAt: now() });
  await audit(actor, 'marketing.abandoned_reminder', 'abandonedCart', cartId, null, { phone: c.phone });
  return r;
};

export type Segment = 'all' | 'repeat' | 'vip' | 'one_time' | 'inactive_60' | 'subscribers' | 'custom';

export const segmentPhones = async (segment: Segment, custom: string[] = []) => {
  if (segment === 'custom') return [...new Set(custom.map((p) => normalizePhone(p)).filter((p): p is string => !!p))];
  if (segment === 'subscribers') return [...new Set((await repos.subscribers.find({})).map((s) => normalizePhone(s.contact)).filter((p): p is string => !!p))];
  const cs = (await repos.customers.find({ blocked: false })).filter((c) => {
    if (segment === 'repeat') return c.orderCount >= 2;
    if (segment === 'vip') return c.tags.includes('vip');
    if (segment === 'one_time') return c.orderCount === 1;
    if (segment === 'inactive_60') return !!c.lastOrderAt && Date.now() - new Date(c.lastOrderAt).getTime() > 60 * 86400000;
    return true;
  });
  return [...new Set(cs.map((c) => c.phone))];
};

export const sendCampaign = async (input: { segment: Segment; message: string; customPhones?: string[]; dryRun?: boolean }, actor: Actor) => {
  const phones = await segmentPhones(input.segment, input.customPhones);
  if (!phones.length) throw badRequest('No recipients in this segment.');
  if (phones.length > 5000) throw badRequest('Segment too large for one send (max 5,000).');
  const unicode = /[^\x00-\x7F]/.test(input.message);
  const segments = Math.ceil(input.message.length / (unicode ? 67 : 153)) || 1;
  const estimate = { recipients: phones.length, segmentsPerSms: segments, estimatedCost: +(phones.length * segments * 0.35).toFixed(2), unicode };
  if (input.dryRun) return { ...estimate, sent: 0 };
  const campaignId = id('cmp');
  for (const p of phones) {
    const c = await repos.customers.findOne({ phone: p });
    await sendSms(p, input.message.replace(/\{name\}/g, c?.name.split(' ')[0] ?? 'there'), {}, campaignId);
  }
  await audit(actor, 'marketing.sms_campaign', 'campaign', campaignId, null, { segment: input.segment, recipients: phones.length });
  return { ...estimate, sent: phones.length, campaignId };
};

export const smsLogs = async (f: { q?: string; template?: string; from?: string; to?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.template) filter.template = f.template;
  if (f.q) filter.$or = [{ to: rx(f.q) }, { message: rx(f.q) }];
  const rows = await repos.smsLogs.find(filter, { sort: { createdAt: -1 } });
  return { ...page(rows, f.page, f.limit ?? 30), summary: { total: rows.length, cost: +rows.reduce((s, r) => s + r.cost, 0).toFixed(2) } };
};

/* ═════════════════════════ LOGS ═════════════════════════ */

export const auditList = async (f: { q?: string; actor?: string; action?: string; entity?: string; from?: string; to?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.actor) filter.actor = f.actor;
  if (f.entity) filter.entity = { $in: f.entity.split(',') };
  if (f.action) filter.action = rx(f.action);
  if (f.q) filter.$or = [{ entityId: rx(f.q) }, { action: rx(f.q) }, { actor: rx(f.q) }];
  const rows = await repos.auditLogs.find(filter, { sort: { createdAt: -1 } });
  const actors = [...new Set((await repos.auditLogs.find({})).map((a) => a.actor))];
  return { ...page(rows, f.page, Math.min(f.limit ?? 30, 1000)), actors };
};

export const eventsList = async (f: { name?: string; from?: string; to?: string; page?: number; limit?: number }) => {
  const filter: Record<string, unknown> = { ...withinDates(f.from, f.to) };
  if (f.name) filter.name = { $in: f.name.split(',') };
  const rows = (await repos.events.find(filter, { sort: { createdAt: -1 } })).filter((e) => !e.eventId.startsWith('seed_'));
  return page(rows, f.page, f.limit ?? 30);
};

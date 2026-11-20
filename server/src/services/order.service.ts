import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import type { Address, Order, OrderStatus, PaymentMethod, Product, TrafficSource } from '../types/domain.js';
import { hmac, id, normalizePhone } from '../utils/text.js';
import { audit, type Actor } from './audit.service.js';
import { sendSms } from './notification.service.js';
import { checkOtpToken } from './otp.service.js';
import { quote, type CartItemInput, type PricedLine } from './pricing.service.js';
import { getSettings } from './settings.service.js';
import { classifySource, trackPurchase } from './tracking.service.js';

export interface CreateOrderInput {
  customer: { name: string; phone: string; email?: string };
  address: Address;
  items: CartItemInput[];
  couponCode?: string;
  paymentMethod: PaymentMethod;
  giftWrap?: boolean;
  customerNote?: string;
  otpToken?: string;
  source?: Partial<TrafficSource>;
  customerId?: string;
}

export interface RequestCtx {
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  sessionId?: string;
  idempotencyKey?: string;
  /** phone of the signed-in customer, when that phone was verified by OTP at registration/reset */
  verifiedPhone?: string;
}

/* ───────────────────────── fraud check ───────────────────────── */

/**
 * Fraud signal from (a) this store's history for the phone and (b) a courier-network success
 * ratio. In production (b) comes from the courier's fraud-check API; in demo it's derived
 * deterministically from the phone so the same number always shows the same result.
 */
export const fraudCheck = async (phone: string) => {
  const orders = await repos.orders.find({ 'customer.phone': phone });
  const delivered = orders.filter((o) => o.status === 'delivered').length;
  const cancelled = orders.filter((o) => o.status === 'cancelled').length;
  const returned = orders.filter((o) => o.status === 'returned').length;
  const customer = await repos.customers.findOne({ phone });
  const seed = parseInt(hmac('courier-demo', phone).slice(0, 6), 16);
  const network = (['steadfast', 'pathao', 'redx'] as const).map((c, i) => {
    const total = (seed >> (i * 3)) % 9;
    const success = Math.max(0, total - ((seed >> (i * 5)) % 3));
    return { courier: c, total, success, rate: total ? Math.round((success / total) * 100) : null };
  });
  const netTotal = network.reduce((s, n) => s + n.total, 0);
  const netSuccess = network.reduce((s, n) => s + n.success, 0);
  const finished = delivered + cancelled + returned;
  const storeRate = finished ? Math.round((delivered / finished) * 100) : null;
  const networkRate = netTotal ? Math.round((netSuccess / netTotal) * 100) : null;
  const rates = [storeRate, networkRate].filter((r): r is number => r !== null);
  const combined = rates.length ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : null;
  const risk: 'low' | 'medium' | 'high' = customer?.blocked ? 'high' : combined === null ? 'medium' : combined >= 80 ? 'low' : combined >= 55 ? 'medium' : 'high';
  return { phone, storeHistory: { total: orders.length, delivered, cancelled, returned, successRate: storeRate }, courierNetwork: network, combinedSuccessRate: combined, risk, blocked: !!customer?.blocked };
};

/* ───────────────────────── stock ───────────────────────── */

const reserveLine = async (line: PricedLine): Promise<{ before: number; after: number } | null> => {
  let before = 0;
  let after = 0;
  const updated = await repos.products.updateWhere(
    line.preOrder ? { slug: line.slug } : { slug: line.slug, variants: { $elemMatch: { sku: line.sku, stock: { $gte: line.qty } } } },
    (p: Product) => ({
      soldCount: p.soldCount + line.qty,
      variants: p.variants.map((v) => {
        if (v.sku !== line.sku) return v;
        before = v.stock;
        after = line.preOrder ? v.stock : v.stock - line.qty;
        return { ...v, stock: after };
      }),
    }),
  );
  return updated ? { before, after } : null;
};

export const adjustStock = async (slug: string, sku: string, change: number, reason: string, actor: string, ref?: string) => {
  let before = 0;
  let after = 0;
  const updated = await repos.products.updateWhere({ slug }, (p: Product) => ({
    variants: p.variants.map((v) => {
      if (v.sku !== sku) return v;
      before = v.stock;
      after = Math.max(0, v.stock + change);
      return { ...v, stock: after };
    }),
  }));
  if (!updated) throw notFound('Product');
  const now = new Date().toISOString();
  await repos.inventoryLogs.insert({ _id: id('inv'), sku, productSlug: slug, change: after - before, before, after, reason, ref, actor, createdAt: now, updatedAt: now });
  // back-in-stock alerts
  if (before <= 0 && after > 0) {
    const alerts = await repos.stockAlerts.find({ productSlug: slug, notified: false });
    for (const a of alerts) {
      await sendSms(a.phone, 'back_in_stock', { product: updated.name.en, url: `${config.clientUrl}/product/${slug}` });
      await repos.stockAlerts.update(a._id, { notified: true });
    }
  }
  return { before, after };
};

/* ───────────────────────── create ───────────────────────── */

const nextOrderNo = async () => {
  const d = new Date();
  const prefix = `RP-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const todays = await repos.orders.count({ orderNo: { $regex: `^${prefix}` } });
  return `${prefix}-${String(todays + 1).padStart(4, '0')}${Math.floor(Math.random() * 10)}`;
};

export const createOrder = async (input: CreateOrderInput, ctx: RequestCtx) => {
  const phone = normalizePhone(input.customer.phone);
  if (!phone) throw badRequest('Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).');

  if (ctx.idempotencyKey) {
    const existing = await repos.orders.findOne({ idempotencyKey: ctx.idempotencyKey });
    if (existing) return { order: toCustomerView(existing), duplicate: true };
  }

  const settings = await getSettings();
  const enabled: Record<PaymentMethod, boolean> = {
    cod: settings.payments.cod, bkash_manual: settings.payments.bkashManual, nagad_manual: settings.payments.nagadManual,
    bkash: settings.payments.bkash, sslcommerz: settings.payments.sslcommerz,
  };
  if (!enabled[input.paymentMethod]) throw badRequest('This payment method is not available right now.');

  const existingCustomer = await repos.customers.findOne({ phone });
  if (existingCustomer?.blocked) throw forbidden('We are unable to accept orders from this number. Please contact support.');

  const otpVerified = (!!ctx.verifiedPhone && ctx.verifiedPhone === phone) || checkOtpToken(phone, 'checkout', input.otpToken);
  if (input.paymentMethod === 'cod' && settings.payments.codOtpRequired && !otpVerified)
    throw badRequest('Please verify your phone number with the OTP to place a Cash on Delivery order.');

  const q = await quote({ items: input.items, couponCode: input.couponCode, location: input.address, giftWrap: input.giftWrap, phone, paymentMethod: input.paymentMethod });
  const blocking = q.lines.filter((l) => l.issue === 'out_of_stock' || l.issue === 'unavailable');
  if (blocking.length) throw conflict(`Some items are no longer available: ${blocking.map((l) => l.name.en).join(', ')}. Please update your bag.`);
  if (input.couponCode && q.coupon && !q.coupon.valid) throw badRequest(q.coupon.reason);
  if (q.deliveryCharge == null) throw badRequest('Delivery area is required.');

  // reserve stock atomically; roll back on any failure
  const reserved: { line: PricedLine; before: number; after: number }[] = [];
  for (const line of q.lines.filter((l) => l.qty > 0)) {
    const r = await reserveLine(line);
    if (!r) {
      for (const done of reserved) await adjustStock(done.line.slug, done.line.sku, done.line.preOrder ? 0 : done.line.qty, 'rollback', 'system');
      throw conflict(`"${line.name.en}" (${line.size}) just sold out. Please update your bag.`);
    }
    reserved.push({ line, ...r });
  }

  const fraud = await fraudCheck(phone);
  const now = new Date().toISOString();
  const orderNo = await nextOrderNo();
  const isManual = input.paymentMethod === 'bkash_manual' || input.paymentMethod === 'nagad_manual';

  // upsert the customer by phone (guest checkout creates a lightweight profile)
  let customerId = input.customerId;
  if (!customerId) {
    if (existingCustomer) customerId = existingCustomer._id;
    else {
      customerId = id('cus');
      await repos.customers.insert({
        _id: customerId, name: input.customer.name, phone, email: input.customer.email,
        addresses: [{ ...input.address, id: id('adr'), label: 'Home', isDefault: true }], tags: ['guest'], blocked: false, loyaltyPoints: 0,
        referralCode: `RUP${Math.floor(1000 + Math.random() * 9000)}`, wishlist: [], totalSpent: 0, orderCount: 0, createdAt: now, updatedAt: now,
      });
    }
  }

  const order: Order = {
    _id: id('ord'),
    orderNo,
    customerId,
    customer: { name: input.customer.name.trim(), phone, email: input.customer.email?.trim() || undefined },
    shippingAddress: input.address,
    items: q.lines.filter((l) => l.qty > 0).map((l) => ({
      productId: l.productId, slug: l.slug, name: l.name, image: l.image, sku: l.sku, color: l.color, size: l.size,
      price: l.price, costPrice: l.costPrice, qty: l.qty, lineTotal: l.lineTotal, category: l.category,
    })),
    pricing: {
      subtotal: q.subtotal, discount: q.discount, couponCode: q.coupon?.valid ? q.coupon.coupon?.code : undefined,
      deliveryCharge: q.deliveryCharge, giftWrap: q.giftWrap, total: q.total, advancePaid: 0, due: q.total,
    },
    payment: { method: input.paymentMethod, status: isManual ? 'pending_verification' : 'unpaid', paidAmount: 0 },
    status: 'pending',
    timeline: [{ status: 'pending', at: now, by: 'customer', note: 'Order placed' }],
    shipping: { zone: q.zone! },
    source: classifySource(input.source),
    flags: { otpVerified, fraudRisk: fraud.risk, callConfirmed: false },
    notes: [],
    customerNote: input.customerNote?.trim().slice(0, 500) || undefined,
    giftWrap: !!input.giftWrap,
    idempotencyKey: ctx.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
  await repos.orders.insert(order);

  for (const r of reserved) {
    await repos.inventoryLogs.insert({ _id: id('inv'), sku: r.line.sku, productSlug: r.line.slug, change: r.after - r.before, before: r.before, after: r.after, reason: 'order', ref: orderNo, actor: 'system', createdAt: now, updatedAt: now });
  }
  if (order.pricing.couponCode) await repos.coupons.updateWhere({ code: order.pricing.couponCode }, (c) => ({ usedCount: c.usedCount + 1 }));
  await repos.customers.updateWhere({ _id: customerId }, (c) => ({ orderCount: c.orderCount + 1, lastOrderAt: now }));
  await repos.abandonedCarts.updateWhere({ phone, recovered: false }, { recovered: true });
  await sendSms(phone, 'order_placed', { name: order.customer.name, orderNo, total: order.pricing.total.toLocaleString('en-IN') });
  await trackPurchase(order, ctx);

  return { order: toCustomerView(order), duplicate: false };
};

/* ───────────────────────── read ───────────────────────── */

export const toCustomerView = (o: Order) => ({
  orderNo: o.orderNo,
  status: o.status,
  createdAt: o.createdAt,
  customer: { name: o.customer.name, phone: o.customer.phone },
  shippingAddress: o.shippingAddress,
  items: o.items.map(({ costPrice: _c, ...i }) => i),
  pricing: o.pricing,
  payment: { method: o.payment.method, status: o.payment.status, paidAmount: o.payment.paidAmount },
  shipping: { courier: o.shipping.courier, consignmentId: o.shipping.consignmentId, trackingUrl: o.shipping.trackingUrl, zone: o.shipping.zone },
  timeline: o.timeline.map(({ by: _b, ...t }) => t),
  giftWrap: o.giftWrap,
  customerNote: o.customerNote,
});

/** Public tracking — requires the order number AND the phone it was placed with. */
export const trackOrder = async (orderNo: string, phoneRaw: string) => {
  const phone = normalizePhone(phoneRaw);
  const o = phone ? await repos.orders.findOne({ orderNo: orderNo.trim().toUpperCase(), 'customer.phone': phone }) : null;
  if (!o) throw notFound('Order (check the order number and phone)');
  return toCustomerView(o);
};

/* ───────────────────────── status workflow ───────────────────────── */

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export const allowedNext = (s: OrderStatus) => TRANSITIONS[s];

const restock = async (o: Order, reason: string, actor: string) => {
  for (const i of o.items) await adjustStock(i.slug, i.sku, i.qty, reason, actor, o.orderNo);
};

export const changeStatus = async (orderId: string, next: OrderStatus, actor: Actor, note?: string) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  if (!TRANSITIONS[o.status].includes(next)) throw badRequest(`Cannot move an order from "${o.status}" to "${next}".`);
  const now = new Date().toISOString();
  const patch: Partial<Order> = { status: next, timeline: [...o.timeline, { status: next, at: now, by: actor.name, note }] };

  if (next === 'cancelled' || next === 'returned') await restock(o, next === 'cancelled' ? 'order_cancelled' : 'order_returned', actor.name);
  if (next === 'confirmed') patch.flags = { ...o.flags, callConfirmed: true };
  if (next === 'delivered') {
    patch.deliveredAt = now;
    if (o.payment.method === 'cod') patch.payment = { ...o.payment, status: 'paid', paidAmount: o.pricing.total };
    patch.pricing = { ...o.pricing, due: 0 };
    const s = await getSettings();
    await repos.customers.updateWhere({ _id: o.customerId }, (c) => ({
      totalSpent: c.totalSpent + o.pricing.total,
      loyaltyPoints: c.loyaltyPoints + Math.floor(o.pricing.total * s.loyalty.pointsPerTaka),
    }));
  }
  if (next === 'returned' && o.payment.status === 'paid' && o.payment.method !== 'cod') patch.payment = { ...o.payment, status: 'refunded' };

  const updated = await repos.orders.update(o._id, patch);
  await audit(actor, 'order.status_changed', 'order', o._id, { status: o.status }, { status: next, note });
  await repos.staff.updateWhere({ name: actor.name }, (s) => ({ ordersHandled: s.ordersHandled + 1 }));

  const tpl = { confirmed: 'order_confirmed', shipped: 'order_shipped', delivered: 'order_delivered', cancelled: 'order_cancelled' }[next as string];
  if (tpl)
    await sendSms(o.customer.phone, tpl, {
      name: o.customer.name, orderNo: o.orderNo, courier: o.shipping.courier ?? 'courier',
      trackingUrl: `${config.clientUrl}/track?order=${o.orderNo}`, reviewUrl: `${config.clientUrl}/product/${o.items[0]?.slug}#reviews`,
    });
  return updated!;
};

/* ───────────────────────── courier ───────────────────────── */

export const bookCourier = async (orderId: string, courier: 'steadfast' | 'pathao' | 'redx', actor: Actor) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  if (!['confirmed', 'processing'].includes(o.status)) throw badRequest('Only confirmed or processing orders can be booked with a courier.');
  if (o.shipping.consignmentId) throw conflict('A consignment already exists for this order.');
  // DEMO: simulates the courier API response. Replace with the real Steadfast/Pathao/RedX create-order call.
  const consignmentId = `${courier.slice(0, 2).toUpperCase()}${Date.now().toString().slice(-8)}`;
  const shipping = { ...o.shipping, courier, consignmentId, trackingUrl: `${config.clientUrl}/track?order=${o.orderNo}`, bookedAt: new Date().toISOString() };
  await repos.orders.update(o._id, { shipping });
  await audit(actor, 'order.courier_booked', 'order', o._id, null, { courier, consignmentId });
  return changeStatus(o._id, 'shipped', actor, `Booked with ${courier} · ${consignmentId}`);
};

/** Courier webhook (signature verified in the controller): delivered / returned updates. */
export const applyCourierUpdate = async (consignmentId: string, status: 'delivered' | 'returned') => {
  const o = await repos.orders.findOne({ 'shipping.consignmentId': consignmentId });
  if (!o) throw notFound('Consignment');
  if (o.status === status) return o;
  return changeStatus(o._id, status, { name: `courier:${o.shipping.courier}`, role: 'system' }, 'Courier status update');
};

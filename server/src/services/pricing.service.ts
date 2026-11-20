import { repos } from '../repositories/index.js';
import { badRequest } from '../lib/errors.js';
import { isValidLocation, zoneFor, type Zone } from '../data/locations.js';
import type { Coupon, I18n, PaymentMethod, Product } from '../types/domain.js';
import { activeFlashSale, effectivePrice } from './catalog.service.js';
import { getSettings } from './settings.service.js';

export interface CartItemInput {
  slug: string;
  sku: string;
  qty: number;
}

export interface QuoteInput {
  items: CartItemInput[];
  couponCode?: string;
  location?: { division: string; district: string; area: string };
  giftWrap?: boolean;
  phone?: string;
  paymentMethod?: PaymentMethod;
}

export interface PricedLine {
  productId: string;
  slug: string;
  sku: string;
  name: I18n;
  image: string;
  color: string;
  size: string;
  price: number;
  regularPrice: number;
  costPrice: number;
  qty: number;
  lineTotal: number;
  category: string;
  available: number;
  preOrder: boolean;
  issue?: 'out_of_stock' | 'qty_reduced' | 'unavailable';
}

const MAX_QTY_PER_LINE = 10;

/** Validates a coupon against the cart. Returns discount or a reason it can't be used. */
export const evaluateCoupon = async (code: string, lines: PricedLine[], subtotal: number, phone?: string) => {
  const coupon = await repos.coupons.findOne({ code: code.trim().toUpperCase() });
  const fail = (reason: string) => ({ valid: false as const, reason, coupon: null, discount: 0, freeShipping: false });
  if (!coupon || !coupon.isActive) return fail('This coupon code is not valid.');
  const now = new Date().toISOString();
  if (coupon.startsAt && coupon.startsAt > now) return fail('This coupon is not active yet.');
  if (coupon.endsAt && coupon.endsAt < now) return fail('This coupon has expired.');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return fail('This coupon has reached its usage limit.');
  const eligible = coupon.categories.length ? lines.filter((l) => coupon.categories.includes(l.category)) : lines;
  const eligibleTotal = eligible.reduce((s, l) => s + l.lineTotal, 0);
  if (!eligible.length) return fail('This coupon does not apply to the items in your bag.');
  if (subtotal < coupon.minOrder) return fail(`Add ৳${(coupon.minOrder - subtotal).toLocaleString('en-IN')} more to use this coupon (min. ৳${coupon.minOrder.toLocaleString('en-IN')}).`);
  if (phone) {
    const used = await repos.orders.count({ 'customer.phone': phone, 'pricing.couponCode': coupon.code, status: { $ne: 'cancelled' } });
    if (used >= coupon.perCustomerLimit) return fail('You have already used this coupon.');
    if (coupon.firstOrderOnly && (await repos.orders.count({ 'customer.phone': phone, status: { $ne: 'cancelled' } })) > 0)
      return fail('This coupon is for first orders only.');
  }
  let discount = 0;
  if (coupon.type === 'percent') discount = Math.round((eligibleTotal * coupon.value) / 100);
  if (coupon.type === 'flat') discount = Math.min(coupon.value, eligibleTotal);
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return { valid: true as const, reason: '', coupon: publicCoupon(coupon), discount, freeShipping: coupon.type === 'free_shipping' };
};

const publicCoupon = (c: Coupon) => ({ code: c.code, type: c.type, value: c.value, description: c.description });

export const deliveryChargeFor = (zone: Zone, s: Awaited<ReturnType<typeof getSettings>>) =>
  zone === 'inside_dhaka' ? s.delivery.insideDhaka : zone === 'dhaka_suburb' ? s.delivery.dhakaSuburb : s.delivery.outsideDhaka;

/**
 * Single source of truth for money. Re-prices every line from the database —
 * the client's prices are NEVER trusted. Used by cart, checkout and order creation.
 */
export const quote = async (input: QuoteInput) => {
  if (!input.items.length) throw badRequest('Your bag is empty.');
  if (input.items.length > 30) throw badRequest('Too many items in one order.');
  const [settings, sale] = await Promise.all([getSettings(), activeFlashSale()]);
  const slugs = [...new Set(input.items.map((i) => i.slug))];
  const products = await repos.products.find({ slug: { $in: slugs } });
  const bySlug = new Map<string, Product>(products.map((p) => [p.slug, p]));

  const lines: PricedLine[] = [];
  for (const item of input.items) {
    const p = bySlug.get(item.slug);
    const v = p?.variants.find((x) => x.sku === item.sku);
    if (!p || !v || p.status !== 'active') {
      lines.push({ productId: '', slug: item.slug, sku: item.sku, name: { en: 'Unavailable item', bn: 'অনুপলব্ধ পণ্য' }, image: '', color: '', size: '', price: 0, regularPrice: 0, costPrice: 0, qty: 0, lineTotal: 0, category: '', available: 0, preOrder: false, issue: 'unavailable' });
      continue;
    }
    const wanted = Math.min(Math.max(Math.floor(item.qty), 1), MAX_QTY_PER_LINE);
    const available = p.preOrder ? MAX_QTY_PER_LINE : v.stock;
    const qty = Math.min(wanted, available);
    const price = effectivePrice(p, sale);
    lines.push({
      productId: p._id, slug: p.slug, sku: v.sku, name: p.name, image: p.images[0]?.url ?? '', color: v.color, size: v.size,
      price, regularPrice: p.price, costPrice: p.costPrice, qty, lineTotal: price * qty, category: p.category, available, preOrder: p.preOrder,
      issue: available <= 0 ? 'out_of_stock' : qty < wanted ? 'qty_reduced' : undefined,
    });
  }

  const valid = lines.filter((l) => l.qty > 0);
  const subtotal = valid.reduce((s, l) => s + l.lineTotal, 0);

  let zone: Zone | null = null;
  if (input.location) {
    if (!isValidLocation(input.location.division, input.location.district, input.location.area)) throw badRequest('Please choose a valid delivery area.');
    zone = zoneFor(input.location.district, input.location.area);
  }

  let coupon: Awaited<ReturnType<typeof evaluateCoupon>> | null = null;
  if (input.couponCode) coupon = await evaluateCoupon(input.couponCode, valid, subtotal, input.phone);

  const freeByThreshold = subtotal >= settings.delivery.freeShippingThreshold;
  const baseDelivery = zone ? deliveryChargeFor(zone, settings) : null;
  const deliveryCharge = baseDelivery == null ? null : freeByThreshold || coupon?.freeShipping ? 0 : baseDelivery;
  const discount = coupon?.valid ? coupon.discount : 0;
  const giftWrap = input.giftWrap ? settings.delivery.giftWrapFee : 0;
  const total = Math.max(0, subtotal - discount + (deliveryCharge ?? 0) + giftWrap);
  const advance =
    input.paymentMethod === 'cod' && settings.payments.codAdvanceDeliveryCharge ? deliveryCharge ?? 0 : input.paymentMethod && input.paymentMethod !== 'cod' ? total : 0;

  return {
    lines,
    hasIssues: lines.some((l) => l.issue),
    itemCount: valid.reduce((s, l) => s + l.qty, 0),
    subtotal,
    discount,
    coupon,
    zone,
    deliveryCharge,
    giftWrap,
    total,
    advance,
    due: total - advance,
    freeShipping: {
      threshold: settings.delivery.freeShippingThreshold,
      remaining: Math.max(0, settings.delivery.freeShippingThreshold - subtotal),
      unlocked: freeByThreshold,
    },
  };
};
export type Quote = Awaited<ReturnType<typeof quote>>;

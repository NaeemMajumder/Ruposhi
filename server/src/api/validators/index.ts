import { z } from 'zod';
import { youtubeId } from '../../utils/youtube.js';

/* ---------- primitives ---------- */
const qbool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
const money = z.coerce.number().int().min(0).max(10_000_000);
const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).optional();
const phone = z.string().trim().min(10).max(16).regex(/^[+\d\s-]+$/, 'Invalid phone number');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional();
const i18n = (max: number) => z.object({ en: z.string().trim().max(max), bn: z.string().trim().max(max) });
const pageQ = { page: z.coerce.number().int().min(1).max(10_000).optional(), limit: z.coerce.number().int().min(1).max(1000).optional() };
const csv = z.string().trim().max(500).optional();

export const address = z.object({
  division: text(40),
  district: text(40),
  area: text(60),
  address: text(200),
  landmark: optText(120),
});

const source = z
  .object({
    utm_source: optText(120), utm_medium: optText(120), utm_campaign: optText(120), fbclid: optText(300), gclid: optText(300),
    referrer: optText(300), landing: optText(300),
  })
  .partial()
  .optional();

const cartItem = z.object({ slug: text(120), sku: text(60), qty: z.coerce.number().int().min(1).max(10) });

/* ---------- public ---------- */
export const productListQuery = z.object({
  q: optText(80), category: csv, gender: z.enum(['men', 'women']).optional(), fabric: csv, occasion: csv, color: csv, size: csv,
  minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(), inStock: qbool.optional(), onSale: qbool.optional(),
  isNew: qbool.optional(), featured: qbool.optional(), rating: z.coerce.number().min(0).max(5).optional(), tag: optText(40), slugs: z.string().max(2000).optional(), ids: z.string().max(2000).optional(),
  sort: z.enum(['featured', 'newest', 'price_asc', 'price_desc', 'popular', 'rating']).optional(),
  ...pageQ,
});

export const suggestQuery = z.object({ q: text(80) });
export const slugParam = z.object({ slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/, 'Invalid slug') });
export const idParam = z.object({ id: z.string().trim().min(3).max(60).regex(/^[\w-]+$/, 'Invalid id') });

export const reviewsQuery = z.object({ sort: z.enum(['newest', 'highest', 'lowest', 'photos']).optional(), ...pageQ });
export const reviewBody = z.object({
  name: text(60), phone, orderNo: optText(30), rating: z.coerce.number().int().min(1).max(5), title: text(100), body: z.string().trim().min(10).max(1500),
});

export const quoteBody = z.object({
  items: z.array(cartItem).min(1).max(30),
  couponCode: optText(30),
  location: z.object({ division: text(40), district: text(40), area: text(60) }).optional(),
  giftWrap: z.boolean().optional(),
  phone: phone.optional(),
  paymentMethod: z.enum(['cod', 'bkash_manual', 'nagad_manual', 'bkash', 'sslcommerz']).optional(),
});

export const couponBody = z.object({ code: text(30), items: z.array(cartItem).min(1).max(30), phone: phone.optional() });

export const otpPurpose = z.enum(['checkout', 'track', 'register', 'reset']);
// 'reset' codes are only sent through /auth/password/forgot (account must exist)
export const otpSendBody = z.object({ phone, purpose: z.enum(['checkout', 'track', 'register']) });
export const otpVerifyBody = z.object({ phone, purpose: otpPurpose, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });

export const createOrderBody = z.object({
  customer: z.object({ name: text(80), phone, email: z.string().trim().email().max(120).optional().or(z.literal('')) }),
  address,
  items: z.array(cartItem).min(1).max(30),
  couponCode: optText(30),
  paymentMethod: z.enum(['cod', 'bkash_manual', 'nagad_manual', 'bkash', 'sslcommerz']),
  giftWrap: z.boolean().optional(),
  customerNote: optText(500),
  otpToken: optText(200),
  source,
  fbp: optText(200),
  fbc: optText(300),
  sessionId: optText(80),
});

export const trackQuery = z.object({ orderNo: text(30), phone });
export const manualPaymentBody = z.object({ phone, trxId: text(20) });
export const gatewayInitBody = z.object({ phone });
export const gatewayCompleteBody = z.object({ orderNo: text(30), token: text(200), outcome: z.enum(['success', 'failed', 'cancelled']) });

export const subscribeBody = z.object({ contact: text(120), source: z.enum(['footer', 'popup', 'checkout', 'account']).default('footer') });
export const contactBody = z.object({ name: text(80), phone, email: z.string().trim().email().max(120).optional().or(z.literal('')), subject: text(120), message: z.string().trim().min(10).max(2000) });
export const notifyBody = z.object({ phone, size: optText(20), color: optText(40) });
export const abandonBody = z.object({
  phone, name: optText(80),
  items: z.array(z.object({ slug: text(120), name: text(160), qty: z.coerce.number().int().min(1).max(10), price: money, size: text(20), color: text(40) })).min(1).max(30),
});

export const eventBody = z.object({
  name: z.enum(['page_view', 'view_content', 'search', 'add_to_cart', 'add_to_wishlist', 'initiate_checkout', 'add_payment_info', 'purchase', 'lead', 'complete_registration']),
  eventId: text(120), sessionId: optText(80), url: optText(500), productSlug: optText(140), value: z.coerce.number().min(0).max(10_000_000).optional(),
  contentIds: z.array(z.string().max(140)).max(30).optional(), source, fbp: optText(200), fbc: optText(300),
});

/* ---------- account ---------- */
export const profileBody = z.object({ name: optText(80) });
export const addressBody = address.extend({ label: text(30), isDefault: z.boolean().optional() });
export const addressPatchBody = addressBody.partial();
export const ordersQuery = z.object({ status: optText(20) });

/* ---------- admin ---------- */
const dateRangeQ = { from: date, to: date };

export const dashboardQuery = z.object(dateRangeQ);
export const reportQuery = z.object({ ...dateRangeQ, groupBy: z.enum(['day', 'week', 'month']).optional() });
export const reportParam = z.object({ type: z.enum(['sales', 'products', 'categories', 'payments', 'districts', 'channels', 'couriers', 'coupons', 'customers', 'profit']) });

export const adminOrdersQuery = z.object({
  q: optText(60), status: csv, paymentMethod: csv, paymentStatus: csv, district: csv, channel: csv, courier: csv, risk: csv,
  sort: z.enum(['createdAt:desc', 'createdAt:asc', 'total:desc', 'total:asc', 'customer:asc', 'customer:desc']).optional(), ...dateRangeQ, ...pageQ,
});
export const statusBody = z.object({ status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']), note: optText(300) });
export const bulkStatusBody = z.object({ ids: z.array(z.string().max(60)).min(1).max(200), status: statusBody.shape.status });
export const noteBody = z.object({ text: text(1000) });
export const courierBody = z.object({ courier: z.enum(['steadfast', 'pathao', 'redx']) });
export const editItemsBody = z.object({ items: z.array(z.object({ sku: text(60), qty: z.coerce.number().int().min(0).max(10) })).min(1).max(30) });
export const verifyPaymentBody = z.object({ approve: z.boolean() });
export const callConfirmBody = z.object({ value: z.boolean() });

export const adminProductsQuery = z.object({
  q: optText(60), category: csv, status: csv, stock: z.enum(['in', 'low', 'out']).optional(), featured: qbool.optional(),
  sort: z.enum(['createdAt:desc', 'createdAt:asc', 'price:asc', 'price:desc', 'stock:asc', 'stock:desc', 'sold:desc', 'name:asc']).optional(), ...pageQ,
});

export const productBody = z.object({
  slug: z.string().trim().max(120).optional(), // no default: a PATCH without slug must not wipe it
  sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/, 'SKU: letters, numbers, dashes'),
  name: i18n(160), shortDescription: i18n(300), description: i18n(4000), care: i18n(500),
  category: text(40), gender: z.enum(['men', 'women']), fabric: text(40),
  occasions: z.array(z.string().trim().max(30)).max(12), tags: z.array(z.string().trim().max(30)).max(20), badges: z.array(z.enum(['bestseller', 'limited', 'new'])).max(3),
  colors: z.array(z.object({ name: i18n(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).min(1).max(12),
  sizes: z.array(z.string().trim().max(20)).min(1).max(15),
  variants: z.array(z.object({ sku: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9-]+$/), color: text(40), size: text(20), stock: z.coerce.number().int().min(0).max(100000) })).min(1).max(150),
  price: money, compareAtPrice: money.optional(), costPrice: money,
  images: z.array(z.object({ url: z.string().url().max(600), alt: i18n(200) })).min(1).max(12),
  // YouTube link only — videos are never uploaded to our storage
  videoUrl: z.string().trim().max(300).refine((u) => u === '' || youtubeId(u) !== null, 'Use a YouTube link (youtube.com/watch?v=…, youtu.be/… or /shorts/…)').optional(),
  isFeatured: z.boolean(), isNewArrival: z.boolean(), preOrder: z.boolean(), status: z.enum(['active', 'draft', 'archived']),
  publishAt: z.string().max(40).optional(),
  seo: z.object({ title: z.string().trim().max(70), description: z.string().trim().max(170) }),
  completeTheLook: z.array(z.string().max(140)).max(6).optional(),
});
export const productPatchBody = productBody.partial();
export const bulkPriceBody = z.object({ category: optText(40), productIds: z.array(z.string().max(60)).max(500).optional(), percent: z.coerce.number().min(-90).max(90), field: z.enum(['price', 'compareAtPrice']) });

export const categoryBody = z.object({ slug: z.string().trim().max(60).default(''), name: i18n(60), description: i18n(400), image: z.string().url().max(600), sortOrder: z.coerce.number().int().min(0).max(999), isActive: z.boolean() });

export const inventoryQuery = z.object({ q: optText(60), category: csv, stock: csv, ...pageQ });
export const inventoryAdjustBody = z.object({ slug: text(140), sku: text(60), change: z.coerce.number().int().min(-100000).max(100000), reason: z.enum(['restock', 'damaged', 'lost', 'correction', 'return', 'transfer']), ref: optText(60) });
export const inventoryLogsQuery = z.object({ q: optText(60), reason: csv, ...dateRangeQ, ...pageQ });

export const customersQuery = z.object({
  q: optText(60), tag: csv, blocked: qbool.optional(), minSpent: z.coerce.number().min(0).optional(), maxSpent: z.coerce.number().min(0).optional(),
  minOrders: z.coerce.number().int().min(0).optional(), sort: z.enum(['totalSpent:desc', 'totalSpent:asc', 'orderCount:desc', 'createdAt:desc', 'createdAt:asc', 'name:asc']).optional(), ...dateRangeQ, ...pageQ,
});
export const customerPatchBody = z.object({ tags: z.array(z.string().trim().max(30)).max(10).optional(), blocked: z.boolean().optional(), notes: optText(1000), name: optText(80) });

export const couponBodyAdmin = z.object({
  code: text(20), type: z.enum(['percent', 'flat', 'free_shipping']), value: z.coerce.number().min(0).max(100000), maxDiscount: money.optional(), minOrder: money,
  firstOrderOnly: z.boolean(), categories: z.array(z.string().max(40)).max(10), usageLimit: z.coerce.number().int().min(1).optional(), perCustomerLimit: z.coerce.number().int().min(1).max(100),
  startsAt: z.string().max(40).optional(), endsAt: z.string().max(40).optional(), isActive: z.boolean(), description: i18n(160),
});
export const flashSaleBody = z.object({ title: i18n(80), productSlugs: z.array(z.string().max(140)).min(1).max(100), discountPercent: z.coerce.number().int().min(1).max(90), startsAt: text(40), endsAt: text(40), isActive: z.boolean() });

export const reviewsAdminQuery = z.object({ status: csv, rating: z.coerce.number().int().min(1).max(5).optional(), q: optText(60), ...pageQ });
export const moderateBody = z.object({ status: z.enum(['approved', 'hidden', 'pending']).optional(), reply: optText(1000) });

export const cmsBody = z
  .object({
    announcements: z.array(i18n(160)).max(6),
    hero: z.array(z.object({ eyebrow: i18n(60), title: i18n(80), subtitle: i18n(240), cta: i18n(40), href: z.string().max(200), image: z.string().url().max(600) })).max(5),
    lookbook: z.array(z.object({ image: z.string().url().max(600), caption: i18n(80), productSlug: z.string().max(140) })).max(12),
    testimonials: z.array(z.object({ name: text(60), city: text(60), text: i18n(400), rating: z.coerce.number().int().min(1).max(5) })).max(12),
    promises: z.array(z.object({ title: i18n(60), text: i18n(200) })).max(6),
  })
  .partial();

export const settingsBody = z
  .object({
    store: z.object({ name: text(60), email: z.string().email(), phone: text(30), address: text(200), whatsapp: text(20), facebook: z.string().max(200), instagram: z.string().max(200), youtube: z.string().max(200) }).partial(),
    delivery: z.object({ insideDhaka: money, dhakaSuburb: money, outsideDhaka: money, freeShippingThreshold: money, insideDays: text(10), outsideDays: text(10), giftWrapFee: money }).partial(),
    payments: z.object({ cod: z.boolean(), bkashManual: z.boolean(), nagadManual: z.boolean(), bkash: z.boolean(), sslcommerz: z.boolean(), codAdvanceDeliveryCharge: z.boolean(), codOtpRequired: z.boolean(), bkashNumber: text(20), nagadNumber: text(20) }).partial(),
    tracking: z.object({ metaPixelId: z.string().max(30).regex(/^\d*$/), ga4Id: z.string().max(30), gtmId: z.string().max(30), tiktokPixelId: z.string().max(40) }).partial(),
    smsTemplates: z.record(z.string().max(40), z.string().max(480)),
    loyalty: z.object({ pointsPerTaka: z.coerce.number().min(0).max(1), takaPerPoint: z.coerce.number().min(0).max(10) }).partial(),
    lowStockThreshold: z.coerce.number().int().min(0).max(1000),
    maintenanceMode: z.boolean(),
  })
  .partial();

export const staffBody = z.object({ name: text(60), email: z.string().trim().email().max(120), role: z.enum(['owner', 'manager', 'order_staff', 'content_editor']), active: z.boolean(), password: z.string().min(8).max(72).optional() });

export const abandonedQuery = z.object({ recovered: qbool.optional(), ...dateRangeQ, ...pageQ });
export const campaignBody = z.object({ segment: z.enum(['all', 'repeat', 'vip', 'one_time', 'inactive_60', 'subscribers', 'custom']), message: z.string().trim().min(5).max(480), customPhones: z.array(z.string().max(20)).max(5000).optional(), dryRun: z.boolean().optional() });
export const smsLogsQuery = z.object({ q: optText(60), template: optText(40), ...dateRangeQ, ...pageQ });
export const auditQuery = z.object({ q: optText(60), actor: optText(60), action: optText(60), entity: csv, ...dateRangeQ, ...pageQ });
export const eventsQuery = z.object({ name: csv, ...dateRangeQ, ...pageQ });
export const listQuery = z.object({ q: optText(60), status: optText(20), ...dateRangeQ, ...pageQ });
export const contactPatchBody = z.object({ status: z.enum(['new', 'read', 'replied']) });
export const courierWebhookBody = z.object({ consignmentId: text(40), status: z.enum(['delivered', 'returned']) });

export const mediaSignBody = z.object({ kind: z.enum(['products', 'categories', 'banners', 'lookbook']) });

/* ───────────────────────── auth ───────────────────────── */
const password = z.string().min(1, 'Enter your password').max(200);
const newPassword = z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long');
const email = z.string().trim().max(120).email('Enter a valid email');
export const registerBody = z.object({ name: z.string().trim().min(2, 'Enter your name').max(80), email, phone, password: newPassword, otpToken: z.string().min(10).max(200) });
export const registerCheckBody = z.object({ email: email.optional(), phone: phone.optional() });
export const loginBody = z.object({ identifier: z.string().trim().min(3, 'Enter your email or phone').max(120), password });
export const forgotBody = z.object({ phone });
export const resetBody = z.object({ phone, code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'), password: newPassword });
export const changePasswordBody = z.object({ current: password, password: newPassword });
export const changeEmailBody = z.object({ email, password });
export const staffLoginBody = z.object({ email, password });

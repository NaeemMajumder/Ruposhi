/** Domain model shared across services. All money values are whole BDT (taka) integers. */

export type Lang = 'en' | 'bn';
export type I18n = { en: string; bn: string };

export type CategorySlug = 'saree' | 'panjabi' | 'salwar-kameez' | 'kurti';

export interface BaseDoc {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  url: string;
  alt: I18n;
}

export interface ProductColor {
  name: I18n;
  hex: string;
}

export interface Variant {
  sku: string;
  color: string; // ProductColor.name.en
  size: string;
  stock: number;
}

export interface Product extends BaseDoc {
  slug: string;
  sku: string;
  name: I18n;
  shortDescription: I18n;
  description: I18n;
  category: CategorySlug;
  gender: 'women' | 'men';
  fabric: string;
  occasions: string[];
  colors: ProductColor[];
  sizes: string[];
  variants: Variant[];
  price: number;
  compareAtPrice?: number;
  costPrice: number;
  images: ProductImage[];
  videoUrl?: string;
  tags: string[];
  badges: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  preOrder: boolean;
  status: 'active' | 'draft' | 'archived';
  publishAt?: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  care: I18n;
  seo: { title: string; description: string };
  completeTheLook?: string[]; // product slugs
}

export interface Category extends BaseDoc {
  slug: CategorySlug | string;
  name: I18n;
  description: I18n;
  image: string;
  sortOrder: number;
  isActive: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'cod' | 'bkash_manual' | 'nagad_manual' | 'bkash' | 'sslcommerz';
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'partial' | 'paid' | 'refunded' | 'failed';

export interface OrderItem {
  productId: string;
  slug: string;
  name: I18n;
  image: string;
  sku: string;
  color: string;
  size: string;
  price: number;
  costPrice: number;
  qty: number;
  lineTotal: number;
  category: string;
}

export interface Address {
  division: string;
  district: string;
  area: string;
  address: string;
  landmark?: string;
}

export interface TrafficSource {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
  landing?: string;
  channel: 'facebook' | 'google' | 'instagram' | 'tiktok' | 'direct' | 'email' | 'sms' | 'referral' | 'other';
}

export interface TimelineEntry {
  status: OrderStatus | string;
  at: string;
  by: string;
  note?: string;
}

export interface Order extends BaseDoc {
  orderNo: string;
  customerId?: string;
  customer: { name: string; phone: string; email?: string };
  shippingAddress: Address;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    discount: number;
    couponCode?: string;
    deliveryCharge: number;
    giftWrap: number;
    total: number;
    advancePaid: number;
    due: number;
  };
  payment: { method: PaymentMethod; status: PaymentStatus; trxId?: string; paidAmount: number; gatewayRef?: string };
  status: OrderStatus;
  timeline: TimelineEntry[];
  shipping: {
    zone: 'inside_dhaka' | 'dhaka_suburb' | 'outside_dhaka';
    courier?: 'steadfast' | 'pathao' | 'redx';
    consignmentId?: string;
    trackingUrl?: string;
    bookedAt?: string;
  };
  source: TrafficSource;
  flags: { otpVerified: boolean; fraudRisk: 'low' | 'medium' | 'high'; callConfirmed: boolean };
  notes: { text: string; by: string; at: string }[];
  customerNote?: string;
  giftWrap: boolean;
  idempotencyKey?: string;
  deliveredAt?: string;
}

export interface Customer extends BaseDoc {
  name: string;
  phone: string;
  email?: string;
  addresses: (Address & { id: string; label: string; isDefault: boolean })[];
  tags: string[];
  blocked: boolean;
  loyaltyPoints: number;
  referralCode: string;
  wishlist: string[];
  totalSpent: number;
  orderCount: number;
  lastOrderAt?: string;
  notes?: string;
  /** auth — present only for registered accounts (guests have no password) */
  auth?: AuthState;
}

export interface AuthState {
  passwordHash: string;
  /** bumped on logout-everywhere / password change → invalidates every issued session */
  tokenVersion: number;
  failedLogins: number;
  lockedUntil?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  passwordChangedAt: string;
  phoneVerified: boolean;
}

export interface Coupon extends BaseDoc {
  code: string;
  type: 'percent' | 'flat' | 'free_shipping';
  value: number;
  maxDiscount?: number;
  minOrder: number;
  firstOrderOnly: boolean;
  categories: string[];
  usageLimit?: number;
  perCustomerLimit: number;
  usedCount: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  description: I18n;
}

export interface Review extends BaseDoc {
  productId: string;
  productSlug: string;
  customerName: string;
  customerId?: string;
  orderNo?: string;
  rating: number;
  title: string;
  body: string;
  photos: string[];
  verified: boolean;
  status: 'pending' | 'approved' | 'hidden';
  reply?: string;
}

export interface FlashSale extends BaseDoc {
  title: I18n;
  productSlugs: string[];
  discountPercent: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface AuditLog extends BaseDoc {
  actor: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

export interface InventoryLog extends BaseDoc {
  sku: string;
  productSlug: string;
  change: number;
  before: number;
  after: number;
  reason: string;
  ref?: string;
  actor: string;
}

export interface SmsLog extends BaseDoc {
  to: string;
  template: string;
  message: string;
  status: 'sent' | 'demo' | 'failed';
  cost: number;
  campaignId?: string;
}

export interface AbandonedCart extends BaseDoc {
  phone: string;
  name?: string;
  items: { slug: string; name: string; qty: number; price: number; size: string; color: string }[];
  value: number;
  recovered: boolean;
  remindersSent: number;
  lastReminderAt?: string;
}

export interface TrackingEvent extends BaseDoc {
  name: string;
  eventId: string;
  sessionId?: string;
  productSlug?: string;
  value?: number;
  /** aggregated bucket size (seeded demo data); real events count as 1 */
  count?: number;
  url?: string;
  source: Partial<TrafficSource>;
  sentToMeta: 'sent' | 'dry-run' | 'skipped' | 'failed';
  sentToGa4: 'sent' | 'dry-run' | 'skipped' | 'failed';
}

export interface Settings extends BaseDoc {
  store: { name: string; email: string; phone: string; address: string; whatsapp: string; facebook: string; instagram: string; youtube: string };
  delivery: { insideDhaka: number; dhakaSuburb: number; outsideDhaka: number; freeShippingThreshold: number; insideDays: string; outsideDays: string; giftWrapFee: number };
  payments: { cod: boolean; bkashManual: boolean; nagadManual: boolean; bkash: boolean; sslcommerz: boolean; codAdvanceDeliveryCharge: boolean; codOtpRequired: boolean; bkashNumber: string; nagadNumber: string };
  tracking: { metaPixelId: string; ga4Id: string; gtmId: string; tiktokPixelId: string };
  smsTemplates: Record<string, string>;
  loyalty: { pointsPerTaka: number; takaPerPoint: number };
  lowStockThreshold: number;
  maintenanceMode: boolean;
}

export interface Cms extends BaseDoc {
  announcements: I18n[];
  hero: { eyebrow: I18n; title: I18n; subtitle: I18n; cta: I18n; href: string; image: string }[];
  lookbook: { image: string; caption: I18n; productSlug: string }[];
  testimonials: { name: string; city: string; text: I18n; rating: number }[];
  promises: { title: I18n; text: I18n }[];
}

export interface Staff extends BaseDoc {
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  ordersHandled: number;
  auth?: AuthState;
}

export type AdminRole = 'owner' | 'manager' | 'order_staff' | 'content_editor';

export interface ContactMessage extends BaseDoc {
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
}

export interface Subscriber extends BaseDoc {
  contact: string;
  source: string;
}

export interface StockAlert extends BaseDoc {
  productSlug: string;
  phone: string;
  size?: string;
  color?: string;
  notified: boolean;
}

export interface OtpRecord extends BaseDoc {
  phone: string;
  purpose: string;
  codeHash: string;
  attempts: number;
  expiresAt: string;
  verified: boolean;
}

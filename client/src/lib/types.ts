export type Lang = 'en' | 'bn';
export type I18n = { en: string; bn: string };

export interface ProductColor { name: I18n; hex: string }
export interface Variant { sku: string; color: string; size: string; stock: number }

export interface Product {
  _id: string;
  slug: string;
  sku: string;
  name: I18n;
  shortDescription: I18n;
  description: I18n;
  category: string;
  gender: 'men' | 'women';
  fabric: string;
  occasions: string[];
  colors: ProductColor[];
  sizes: string[];
  variants: Variant[];
  price: number;
  regularPrice: number;
  compareAtPrice?: number;
  images: { url: string; alt: I18n }[];
  videoUrl?: string;
  tags: string[];
  badges: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  preOrder: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  care: I18n;
  seo: { title: string; description: string };
  completeTheLook?: string[];
  flashSale: { endsAt: string; percent: number; title: I18n } | null;
  totalStock: number;
  inStock: boolean;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Facets {
  categories: { value: string; count: number }[];
  fabrics: { value: string; count: number }[];
  occasions: { value: string; count: number }[];
  colors: { value: string; hex: string; bn: string; count: number }[];
  sizes: { value: string; count: number }[];
  price: { min: number; max: number };
}

export interface ProductList { items: Product[]; total: number; page: number; limit: number; pages: number; facets: Facets }

export interface Category { _id: string; slug: string; name: I18n; description: I18n; image: string; sortOrder: number; productCount?: number }

export interface HomeData {
  announcements: I18n[];
  hero: { eyebrow: I18n; title: I18n; subtitle: I18n; cta: I18n; href: string; image: string }[];
  lookbook: { image: string; caption: I18n; productSlug: string }[];
  testimonials: { name: string; city: string; text: I18n; rating: number }[];
  promises: { title: I18n; text: I18n }[];
  flashSale: { title: I18n; endsAt: string; percent: number; items: Product[] } | null;
  featured: Product[];
  newArrivals: Product[];
  bestsellers: Product[];
  categories: Category[];
}

export interface PublicSettings {
  store: { name: string; email: string; phone: string; address: string; whatsapp: string; facebook: string; instagram: string; youtube: string };
  delivery: { insideDhaka: number; dhakaSuburb: number; outsideDhaka: number; freeShippingThreshold: number; insideDays: string; outsideDays: string; giftWrapFee: number };
  payments: { cod: boolean; bkashManual: boolean; nagadManual: boolean; bkash: boolean; sslcommerz: boolean; codAdvanceDeliveryCharge: boolean; codOtpRequired: boolean; bkashNumber: string; nagadNumber: string };
  tracking: { metaPixelId: string; ga4Id: string; gtmId: string; tiktokPixelId: string };
  loyalty: { pointsPerTaka: number; takaPerPoint: number };
  maintenanceMode: boolean;
}

export interface Review { _id: string; customerName: string; rating: number; title: string; body: string; photos: string[]; verified: boolean; reply?: string; createdAt: string }

export type PaymentMethod = 'cod' | 'bkash_manual' | 'nagad_manual' | 'bkash' | 'sslcommerz';

export interface QuoteLine {
  productId: string; slug: string; sku: string; name: I18n; image: string; color: string; size: string; price: number; regularPrice: number;
  qty: number; lineTotal: number; category: string; available: number; preOrder: boolean; issue?: 'out_of_stock' | 'qty_reduced' | 'unavailable';
}

export interface Quote {
  lines: QuoteLine[];
  hasIssues: boolean;
  itemCount: number;
  subtotal: number;
  discount: number;
  coupon: { valid: boolean; reason: string; coupon: { code: string; description: I18n } | null; discount: number; freeShipping: boolean } | null;
  zone: string | null;
  deliveryCharge: number | null;
  giftWrap: number;
  total: number;
  advance: number;
  due: number;
  freeShipping: { threshold: number; remaining: number; unlocked: boolean };
}

export interface OrderView {
  orderNo: string;
  status: string;
  createdAt: string;
  customer: { name: string; phone: string };
  shippingAddress: { division: string; district: string; area: string; address: string; landmark?: string };
  items: { productId: string; slug: string; name: I18n; image: string; sku: string; color: string; size: string; price: number; qty: number; lineTotal: number }[];
  pricing: { subtotal: number; discount: number; couponCode?: string; deliveryCharge: number; giftWrap: number; total: number; advancePaid: number; due: number };
  payment: { method: PaymentMethod; status: string; paidAmount: number };
  shipping: { courier?: string; consignmentId?: string; trackingUrl?: string; zone: string };
  timeline: { status: string; at: string; note?: string }[];
  giftWrap: boolean;
  customerNote?: string;
}

export interface LocationTree { division: string; districts: { name: string; areas: string[] }[] }

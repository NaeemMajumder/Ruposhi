import type { I18n } from '@/lib/types';

export type AdminOrder = {
  _id: string; orderNo: string; customerId?: string; customer: { name: string; phone: string; email?: string };
  shippingAddress: { division: string; district: string; area: string; address: string; landmark?: string };
  items: { productId: string; slug: string; name: I18n; image: string; sku: string; color: string; size: string; price: number; costPrice: number; qty: number; lineTotal: number; category: string }[];
  pricing: { subtotal: number; discount: number; couponCode?: string; deliveryCharge: number; giftWrap: number; total: number; advancePaid: number; due: number };
  payment: { method: string; status: string; trxId?: string; paidAmount: number; gatewayRef?: string };
  status: string;
  timeline: { status: string; at: string; by: string; note?: string }[];
  shipping: { zone: string; courier?: string; consignmentId?: string; trackingUrl?: string; bookedAt?: string };
  source: { utm_source?: string; utm_medium?: string; utm_campaign?: string; fbclid?: string; gclid?: string; referrer?: string; landing?: string; channel: string };
  flags: { otpVerified: boolean; fraudRisk: 'low' | 'medium' | 'high'; callConfirmed: boolean };
  notes: { text: string; by: string; at: string }[];
  customerNote?: string; giftWrap: boolean; createdAt: string; deliveredAt?: string;
};
export type Paged<T> = { items: T[]; total: number; page: number; limit: number; pages: number };

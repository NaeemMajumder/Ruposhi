import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import type { Order, TrafficSource } from '../types/domain.js';
import { id, sha256 } from '../utils/text.js';

export interface IncomingEvent {
  name: 'page_view' | 'view_content' | 'search' | 'add_to_cart' | 'add_to_wishlist' | 'initiate_checkout' | 'add_payment_info' | 'purchase' | 'lead' | 'complete_registration';
  eventId: string;
  sessionId?: string;
  url?: string;
  productSlug?: string;
  value?: number;
  contentIds?: string[];
  source?: Partial<TrafficSource>;
  fbp?: string;
  fbc?: string;
  userAgent?: string;
  ip?: string;
  phone?: string;
  email?: string;
}

const META_NAMES: Record<IncomingEvent['name'], string> = {
  page_view: 'PageView', view_content: 'ViewContent', search: 'Search', add_to_cart: 'AddToCart', add_to_wishlist: 'AddToWishlist',
  initiate_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase', lead: 'Lead', complete_registration: 'CompleteRegistration',
};

/** Normalises + SHA-256 hashes user data as Meta requires. Raw PII never leaves the server. */
const hashed = (v?: string) => (v ? sha256(v.trim().toLowerCase()) : undefined);
const phoneE164 = (p?: string) => (p ? `88${p.replace(/\D/g, '').replace(/^88/, '')}` : undefined);

/** Builds the Conversions API payload. `event_id` matches the browser Pixel's eventID → Meta deduplicates. */
export const buildCapiPayload = (e: IncomingEvent) => ({
  data: [
    {
      event_name: META_NAMES[e.name],
      event_time: Math.floor(Date.now() / 1000),
      event_id: e.eventId,
      action_source: 'website',
      event_source_url: e.url,
      user_data: {
        ph: hashed(phoneE164(e.phone)),
        em: hashed(e.email),
        fbp: e.fbp,
        fbc: e.fbc,
        client_ip_address: e.ip,
        client_user_agent: e.userAgent,
      },
      custom_data: e.value != null ? { currency: 'BDT', value: e.value, content_ids: e.contentIds, content_type: 'product' } : undefined,
    },
  ],
  ...(config.meta.testEventCode ? { test_event_code: config.meta.testEventCode } : {}),
});

const sendMeta = async (e: IncomingEvent): Promise<'sent' | 'dry-run' | 'failed'> => {
  if (!config.meta.pixelId || !config.meta.capiToken) return 'dry-run';
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${config.meta.pixelId}/events?access_token=${config.meta.capiToken}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildCapiPayload(e)), signal: AbortSignal.timeout(6000),
    });
    return r.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
};

const sendGa4 = async (e: IncomingEvent): Promise<'sent' | 'dry-run' | 'skipped' | 'failed'> => {
  if (!['purchase', 'add_to_cart', 'initiate_checkout', 'view_content'].includes(e.name)) return 'skipped';
  if (!config.ga4.measurementId || !config.ga4.apiSecret) return 'dry-run';
  try {
    const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${config.ga4.measurementId}&api_secret=${config.ga4.apiSecret}`, {
      method: 'POST',
      body: JSON.stringify({ client_id: e.sessionId ?? e.eventId, events: [{ name: e.name === 'initiate_checkout' ? 'begin_checkout' : e.name === 'view_content' ? 'view_item' : e.name, params: { currency: 'BDT', value: e.value ?? 0, transaction_id: e.name === 'purchase' ? e.eventId : undefined } }] }),
      signal: AbortSignal.timeout(6000),
    });
    return r.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
};

/** First-party event store + server-side relay to Meta CAPI / GA4. */
export const ingestEvent = async (e: IncomingEvent) => {
  const [meta, ga4] = await Promise.all([sendMeta(e), sendGa4(e)]);
  const now = new Date().toISOString();
  await repos.events.insert({
    _id: id('evt'), name: e.name, eventId: e.eventId, sessionId: e.sessionId, productSlug: e.productSlug, value: e.value ?? 1,
    url: e.url?.slice(0, 300), source: e.source ?? {}, sentToMeta: meta, sentToGa4: ga4, createdAt: now, updatedAt: now,
  });
  return { stored: true, meta, ga4 };
};

/** Server-confirmed Purchase — fired only after the order exists in the DB, with the real value. */
export const trackPurchase = (o: Order, ctx: { ip?: string; userAgent?: string; fbp?: string; fbc?: string; sessionId?: string }) =>
  ingestEvent({
    name: 'purchase', eventId: `purchase_${o.orderNo}`, value: o.pricing.total, contentIds: o.items.map((i) => i.slug), source: o.source,
    phone: o.customer.phone, email: o.customer.email, ...ctx,
  });

/** Classifies a session's UTM/click-ids into a reporting channel. */
export const classifySource = (s: Partial<TrafficSource> = {}): TrafficSource => {
  const src = (s.utm_source ?? '').toLowerCase();
  const ref = (s.referrer ?? '').toLowerCase();
  let channel: TrafficSource['channel'] = 'direct';
  if (s.fbclid || src.includes('facebook') || src === 'fb' || ref.includes('facebook.com')) channel = 'facebook';
  else if (src.includes('instagram') || ref.includes('instagram.com')) channel = 'instagram';
  else if (s.gclid || src.includes('google') || ref.includes('google.')) channel = 'google';
  else if (src.includes('tiktok') || ref.includes('tiktok.com')) channel = 'tiktok';
  else if (src === 'sms') channel = 'sms';
  else if (src.includes('newsletter') || s.utm_medium === 'email') channel = 'email';
  else if (ref) channel = 'referral';
  const clean = (v?: string) => (v ? String(v).slice(0, 120) : undefined);
  return {
    channel,
    utm_source: clean(s.utm_source), utm_medium: clean(s.utm_medium), utm_campaign: clean(s.utm_campaign),
    fbclid: clean(s.fbclid), gclid: clean(s.gclid), referrer: clean(s.referrer), landing: clean(s.landing),
  };
};

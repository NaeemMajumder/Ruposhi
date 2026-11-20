'use client';
import { BROWSER_API } from './config';

/**
 * First-party tracking + Meta Pixel / GA4 with server-side dedup.
 * Every event gets an `eventId`. The browser Pixel fires with { eventID } and the same id is sent
 * to our API, which relays it to the Conversions API — Meta keeps one, not two.
 */
export type EventName = 'page_view' | 'view_content' | 'search' | 'add_to_cart' | 'add_to_wishlist' | 'initiate_checkout' | 'add_payment_info' | 'purchase' | 'lead' | 'complete_registration';

const META: Record<EventName, string> = {
  page_view: 'PageView', view_content: 'ViewContent', search: 'Search', add_to_cart: 'AddToCart', add_to_wishlist: 'AddToWishlist',
  initiate_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase', lead: 'Lead', complete_registration: 'CompleteRegistration',
};
const GA: Partial<Record<EventName, string>> = { view_content: 'view_item', add_to_cart: 'add_to_cart', initiate_checkout: 'begin_checkout', purchase: 'purchase', search: 'search', add_payment_info: 'add_payment_info' };

declare global {
  interface Window {
    fbq?: (...a: unknown[]) => void;
    gtag?: (...a: unknown[]) => void;
  }
}

const SRC_KEY = 'ruposhi-src';
const SID_KEY = 'ruposhi-sid';

const cookie = (n: string) => document.cookie.split('; ').find((c) => c.startsWith(`${n}=`))?.split('=')[1];

export const sessionId = () => {
  try {
    let s = sessionStorage.getItem(SID_KEY);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SID_KEY, s);
    }
    return s;
  } catch {
    return undefined;
  }
};

/** Captures UTM parameters / click ids on landing (last non-direct touch wins, kept 30 days). */
export const captureSource = () => {
  try {
    const p = new URLSearchParams(location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    const found = Object.fromEntries(keys.map((k) => [k, p.get(k) ?? undefined]).filter(([, v]) => v));
    const external = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined;
    if (Object.keys(found).length || external) {
      localStorage.setItem(SRC_KEY, JSON.stringify({ ...found, referrer: external, landing: location.pathname, at: Date.now() }));
    }
  } catch {
    /* storage blocked */
  }
};

export const getSource = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(SRC_KEY) ?? 'null');
    if (!raw || Date.now() - raw.at > 30 * 86400000) return undefined;
    const { at: _a, ...rest } = raw;
    return rest as Record<string, string>;
  } catch {
    return undefined;
  }
};

export const metaCookies = () => ({ fbp: cookie('_fbp'), fbc: cookie('_fbc') });

export function track(name: EventName, data: { value?: number; productSlug?: string; contentIds?: string[]; eventId?: string; searchTerm?: string } = {}) {
  if (typeof window === 'undefined') return;
  const eventId = data.eventId ?? `${name}_${crypto.randomUUID()}`;
  const custom = data.value != null ? { currency: 'BDT', value: data.value, content_ids: data.contentIds, content_type: 'product' } : undefined;
  try {
    window.fbq?.('track', META[name], { ...custom, ...(data.searchTerm ? { search_string: data.searchTerm } : {}) }, { eventID: eventId });
    const ga = GA[name];
    if (ga) window.gtag?.('event', ga, { currency: 'BDT', value: data.value, search_term: data.searchTerm });
  } catch {
    /* pixel blocked */
  }
  // purchase is sent server-side by the API when the order is created — don't double count
  if (name === 'purchase') return;
  const body = JSON.stringify({
    name, eventId, sessionId: sessionId(), url: location.href.slice(0, 480), productSlug: data.productSlug, value: data.value,
    contentIds: data.contentIds, source: getSource(), ...metaCookies(),
  });
  try {
    fetch(`${BROWSER_API}/track/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}

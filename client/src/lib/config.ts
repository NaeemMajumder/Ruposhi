export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
/** Where the Express API lives. Used by Server Components and by the /api/v1 rewrite in next.config.ts. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1').replace(/\/$/, '');
/**
 * Browsers always call the API on the SAME origin (/api/v1 → proxied to API_URL by Next).
 * That keeps the httpOnly session cookies first-party (no third-party-cookie blocking, SameSite=Lax works)
 * and lets the CSP stay `connect-src 'self'`.
 */
export const BROWSER_API = '/api/v1';

export const BRAND = {
  name: 'Ruposhi',
  nameBn: 'রূপসী',
  tagline: { en: 'Heritage, worn beautifully.', bn: 'বাংলার রূপ, আপনার সাজে।' },
  description: {
    en: 'Premium Bangladeshi ethnic wear — Banarasi, Jamdani and Katan sarees, panjabis, salwar kameez and kurtis. What you see is exactly what you get. Cash on delivery across Bangladesh.',
    bn: 'প্রিমিয়াম বাংলাদেশি এথনিক পোশাক — বেনারসি, জামদানি, কাতান শাড়ি, পাঞ্জাবি, সালোয়ার কামিজ ও কুর্তি। যা দেখছেন, ঠিক তাই পাবেন। সারা দেশে ক্যাশ অন ডেলিভারি।',
  },
};

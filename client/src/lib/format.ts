import type { I18n, Lang } from './types';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const toBnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/** ৳1,25,000 — South-Asian grouping, Bangla digits when lang=bn. */
export const money = (n: number | null | undefined, lang: Lang = 'en') => {
  if (n == null) return '—';
  const s = `৳${Math.round(n).toLocaleString('en-IN')}`;
  return lang === 'bn' ? toBnDigits(s) : s;
};

export const num = (n: number, lang: Lang = 'en') => (lang === 'bn' ? toBnDigits(n.toLocaleString('en-IN')) : n.toLocaleString('en-IN'));

export const tr = (v: I18n | undefined, lang: Lang) => (v ? v[lang] || v.en : '');

export const discountPct = (price: number, compare?: number) => (compare && compare > price ? Math.round(((compare - price) / compare) * 100) : 0);

export const dateFmt = (iso: string, lang: Lang = 'en', withTime = false) =>
  new Date(iso).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const titleCase = (s: string) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());

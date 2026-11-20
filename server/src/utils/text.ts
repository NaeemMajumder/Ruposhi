import crypto from 'node:crypto';

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const id = (prefix: string) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;

export const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export const hmac = (secret: string, v: string) => crypto.createHmac('sha256', secret).update(v).digest('hex');

export const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
};

/** Normalise a BD phone number to 01XXXXXXXXX. Returns null when invalid. */
export const normalizePhone = (raw: string): string | null => {
  const digits = raw.replace(/[^\d]/g, '').replace(/^880/, '0').replace(/^88/, '');
  const p = digits.startsWith('0') ? digits : `0${digits}`;
  return /^01[3-9]\d{8}$/.test(p) ? p : null;
};

export const maskPhone = (p: string) => (p.length > 6 ? `${p.slice(0, 3)}****${p.slice(-4)}` : p);

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---------------- Search helpers: typo + Banglish tolerant ---------------- */

/** Bangla word → common romanisations, so "panjabi", "punjabi" and "পাঞ্জাবি" all match. */
const SYNONYMS: Record<string, string[]> = {
  saree: ['saree', 'sari', 'shari', 'shaari', 'শাড়ি', 'শাড়ী'],
  panjabi: ['panjabi', 'punjabi', 'panjabee', 'kurta', 'পাঞ্জাবি', 'পাঞ্জাবী'],
  'salwar kameez': ['salwar', 'shalwar', 'kameez', 'kamiz', 'three piece', 'threepiece', '3 piece', 'থ্রি পিস', 'সালোয়ার', 'কামিজ'],
  kurti: ['kurti', 'kurtee', 'tunic', 'কুর্তি', 'কুর্তা'],
  jamdani: ['jamdani', 'jamdhani', 'জামদানি'],
  muslin: ['muslin', 'moslin', 'মসলিন'],
  silk: ['silk', 'resham', 'সিল্ক', 'রেশম'],
  cotton: ['cotton', 'suti', 'সুতি', 'কটন'],
  red: ['red', 'lal', 'লাল'],
  white: ['white', 'shada', 'sada', 'সাদা'],
  black: ['black', 'kalo', 'কালো'],
  green: ['green', 'sobuj', 'সবুজ'],
  blue: ['blue', 'nil', 'নীল'],
  yellow: ['yellow', 'holud', 'হলুদ'],
  pink: ['pink', 'golapi', 'গোলাপি'],
  wedding: ['wedding', 'biye', 'bie', 'বিয়ে', 'bridal'],
  eid: ['eid', 'ঈদ', 'id'],
};

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
};

/** Expand a user query into canonical terms (handles Bangla, Banglish and small typos). */
export const expandQuery = (q: string): string[] => {
  const tokens = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    for (const [canon, variants] of Object.entries(SYNONYMS)) {
      for (const v of variants) {
        const tolerance = v.length > 5 ? 2 : v.length > 3 ? 1 : 0;
        if (t === v || (t.length > 3 && levenshtein(t, v) <= tolerance)) {
          out.add(canon);
          variants.forEach((x) => out.add(x));
        }
      }
    }
  }
  return [...out];
};

/** Score a searchable text against expanded terms (higher = better). */
export const scoreText = (text: string, terms: string[]) => {
  const hay = text.toLowerCase();
  let score = 0;
  for (const t of terms) {
    if (hay.includes(t)) score += t.length > 3 ? 3 : 1;
    else {
      const words = hay.split(/[^a-zঀ-৿]+/);
      if (t.length > 4 && words.some((w) => w.length > 3 && levenshtein(w, t) <= 1)) score += 1;
    }
  }
  return score;
};

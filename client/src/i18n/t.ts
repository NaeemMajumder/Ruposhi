import type { Dict } from './dictionaries';

/** t('cart.freeRemaining', { amount: '৳500' }) — dotted lookup with {var} interpolation. */
export const makeT = (dict: Dict) => (key: string, vars?: Record<string, string | number>) => {
  const raw = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict);
  const s = typeof raw === 'string' ? raw : key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
};
export type TFn = ReturnType<typeof makeT>;

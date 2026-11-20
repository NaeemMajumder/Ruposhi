'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn, money, titleCase, tr } from '@/lib/format';
import type { Facets } from '@/lib/types';
import { Sheet } from '../ui/Sheet';

type Params = Record<string, string>;
const MULTI = ['category', 'fabric', 'occasion', 'color', 'size'] as const;

function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const current: Params = Object.fromEntries(sp.entries());
  const push = (next: Params) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v != null));
    delete clean.page;
    const qs = new URLSearchParams(clean).toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const toggle = (key: string, value: string) => {
    const set = new Set((current[key] ?? '').split(',').filter(Boolean));
    if (set.has(value)) set.delete(value);
    else set.add(value);
    push({ ...current, [key]: [...set].join(',') });
  };
  const setOne = (key: string, value: string) => push({ ...current, [key]: current[key] === value ? '' : value });
  return { current, push, toggle, setOne, pending };
}

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-line py-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-[13px] font-semibold uppercase tracking-[0.16em]">
        {title}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function CheckRow({ on, label, count, onClick, swatch }: { on: boolean; label: string; count?: number; onClick: () => void; swatch?: string }) {
  return (
    <button onClick={onClick} role="checkbox" aria-checked={on} className="flex min-h-10 w-full items-center gap-3 text-left text-sm">
      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border transition', on ? 'border-espresso bg-espresso text-cream' : 'border-line bg-surface')}>
        {on && <Check className="h-3.5 w-3.5" />}
      </span>
      {swatch && <span className="h-4 w-4 rounded-full border border-line" style={{ background: swatch }} />}
      <span className="flex-1">{label}</span>
      {count != null && <span className="text-xs text-mocha">{count}</span>}
    </button>
  );
}

function Filters({ facets, lockCategory }: { facets: Facets; lockCategory?: boolean }) {
  const { t, lang } = useT();
  const { current, toggle, setOne, push } = useFilterNav();
  const has = (k: string, v: string) => (current[k] ?? '').split(',').includes(v);
  const [min, setMin] = useState(current.minPrice ?? '');
  const [max, setMax] = useState(current.maxPrice ?? '');
  useEffect(() => {
    setMin(current.minPrice ?? '');
    setMax(current.maxPrice ?? '');
  }, [current.minPrice, current.maxPrice]);
  const catLabel = (v: string) => t(`nav.${v}`);

  return (
    <div>
      {!lockCategory && facets.categories.length > 0 && (
        <Group title={t('shop.category')}>
          {facets.categories.map((c) => <CheckRow key={c.value} on={has('category', c.value)} label={catLabel(c.value)} count={c.count} onClick={() => toggle('category', c.value)} />)}
        </Group>
      )}
      <Group title={t('shop.price')}>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            push({ ...current, minPrice: min, maxPrice: max });
          }}
        >
          <label className="flex-1">
            <span className="mb-1 block text-xs text-mocha">{t('shop.min')}</span>
            <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} placeholder={String(facets.price.min)} className="field !py-2" />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-mocha">{t('shop.max')}</span>
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ''))} placeholder={String(facets.price.max)} className="field !py-2" />
          </label>
          <button className="btn-primary !min-h-[42px] !px-4">{t('common.apply')}</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {[[0, 3000], [3000, 6000], [6000, 10000], [10000, 25000]].map(([a, b]) => (
            <button key={a} onClick={() => push({ ...current, minPrice: String(a), maxPrice: String(b) })} className={cn('chip !min-h-8 !text-xs', current.minPrice === String(a) && current.maxPrice === String(b) && 'chip-on')}>
              {money(a, lang)}–{money(b, lang)}
            </button>
          ))}
        </div>
      </Group>
      {facets.sizes.length > 0 && (
        <Group title={t('shop.size')}>
          <div className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => (
              <button key={s.value} onClick={() => toggle('size', s.value)} aria-pressed={has('size', s.value)} className={cn('chip min-w-12 justify-center', has('size', s.value) && 'chip-on')}>
                {s.value}
              </button>
            ))}
          </div>
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title={t('shop.color')}>
          {facets.colors.map((c) => <CheckRow key={c.value} on={has('color', c.value)} label={lang === 'bn' ? c.bn : c.value} count={c.count} swatch={c.hex} onClick={() => toggle('color', c.value)} />)}
        </Group>
      )}
      {facets.fabrics.length > 0 && (
        <Group title={t('shop.fabric')} defaultOpen={false}>
          {facets.fabrics.map((f) => <CheckRow key={f.value} on={has('fabric', f.value)} label={f.value} count={f.count} onClick={() => toggle('fabric', f.value)} />)}
        </Group>
      )}
      {facets.occasions.length > 0 && (
        <Group title={t('shop.occasion')} defaultOpen={false}>
          {facets.occasions.map((o) => <CheckRow key={o.value} on={has('occasion', o.value)} label={t(`occ.${o.value}`) === `occ.${o.value}` ? titleCase(o.value) : t(`occ.${o.value}`)} count={o.count} onClick={() => toggle('occasion', o.value)} />)}
        </Group>
      )}
      <Group title={t('shop.availability')}>
        <CheckRow on={current.inStock === 'true'} label={t('shop.inStockOnly')} onClick={() => setOne('inStock', 'true')} />
        <CheckRow on={current.onSale === 'true'} label={t('shop.onSale')} onClick={() => setOne('onSale', 'true')} />
        <CheckRow on={current.isNew === 'true'} label={t('shop.newOnly')} onClick={() => setOne('isNew', 'true')} />
      </Group>
      <Group title={t('shop.rating')} defaultOpen={false}>
        {[4.5, 4].map((r) => <CheckRow key={r} on={current.rating === String(r)} label={`${r}★ ${t('shop.andUp')}`} onClick={() => setOne('rating', String(r))} />)}
      </Group>
    </div>
  );
}

/** Desktop sidebar + mobile bottom sheet, sharing one URL-driven filter state (shareable, SEO-friendly). */
export function FilterPanel({ facets, total, lockCategory, mode = 'both' }: { facets: Facets; total: number; lockCategory?: boolean; mode?: 'desktop' | 'mobile' | 'both' }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const { current, push, toggle, pending } = useFilterNav();
  const active: { key: string; value: string; label: string }[] = [];
  for (const k of MULTI) for (const v of (current[k] ?? '').split(',').filter(Boolean)) if (!(lockCategory && k === 'category')) active.push({ key: k, value: v, label: k === 'category' ? t(`nav.${v}`) : k === 'occasion' ? t(`occ.${v}`) : v });
  if (current.minPrice || current.maxPrice) active.push({ key: 'price', value: '', label: `${money(Number(current.minPrice || 0), lang)}–${current.maxPrice ? money(Number(current.maxPrice), lang) : '∞'}` });
  for (const k of ['inStock', 'onSale', 'isNew', 'rating']) if (current[k]) active.push({ key: k, value: '', label: k === 'rating' ? `${current.rating}★+` : t(`shop.${k === 'inStock' ? 'inStockOnly' : k === 'onSale' ? 'onSale' : 'newOnly'}`) });
  const clearAll = () => push(Object.fromEntries(Object.entries(current).filter(([k]) => ['q', 'sort'].includes(k) || (lockCategory && k === 'category'))));
  const removeChip = (c: (typeof active)[number]) =>
    c.key === 'price' ? push({ ...current, minPrice: '', maxPrice: '' }) : c.value ? toggle(c.key, c.value) : push({ ...current, [c.key]: '' });

  return (
    <>
      {mode !== 'mobile' && <aside className="hidden w-[270px] shrink-0 lg:block" aria-label={t('shop.filters')}>
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-3">
          <div className="flex items-center justify-between pb-2">
            <p className="font-display text-2xl">{t('shop.filters')}</p>
            {active.length > 0 && <button onClick={clearAll} className="btn-link text-xs">{t('shop.clear')}</button>}
          </div>
          <Filters facets={facets} lockCategory={lockCategory} />
        </div>
      </aside>}
      {mode !== 'desktop' && <>

      <button onClick={() => setOpen(true)} className="chip lg:hidden" aria-haspopup="dialog">
        <SlidersHorizontal className="h-4 w-4" /> {t('shop.filters')}
        {active.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-espresso px-1 text-[11px] text-cream">{active.length}</span>}
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        title={t('shop.filters')}
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button onClick={clearAll} className="btn-ghost">{t('shop.clear')}</button>
            <button onClick={() => setOpen(false)} className="btn-primary">{pending ? t('common.loading') : t('shop.showResults', { n: total })}</button>
          </div>
        }
      >
        <div className="px-5 pb-4">
          <Filters facets={facets} lockCategory={lockCategory} />
        </div>
      </Sheet>

      {active.length > 0 && (
        <div className="order-last flex w-full basis-full flex-wrap gap-2 pt-1" aria-label="Active filters">
          {active.map((c) => (
            <button key={`${c.key}-${c.value}`} onClick={() => removeChip(c)} className="chip !min-h-8 bg-sand !text-xs">
              {c.label} <X className="h-3 w-3" />
            </button>
          ))}
          <button onClick={clearAll} className="btn-link text-xs">{t('shop.clear')}</button>
        </div>
      )}
      {pending && <div className="fixed inset-x-0 top-0 z-[60] h-0.5 animate-pulse bg-gold" aria-hidden="true" />}
      </>}
    </>
  );
}

export function SortSelect() {
  const { t } = useT();
  const { current, push } = useFilterNav();
  const sorts = ['featured', 'newest', 'popular', 'price_asc', 'price_desc', 'rating'];
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('shop.sort')}</span>
      <select
        value={current.sort ?? (current.q ? '' : 'featured')}
        onChange={(e) => push({ ...current, sort: e.target.value })}
        className="chip appearance-none !pr-9 font-medium"
      >
        {current.q && <option value="">{t('shop.sort')}: Relevance</option>}
        {sorts.map((s) => <option key={s} value={s}>{t(`shop.sorts.${s}`)}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" />
    </label>
  );
}

export { tr };

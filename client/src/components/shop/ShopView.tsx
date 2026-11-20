import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import { api } from '@/lib/api';
import { getI18n } from '@/i18n/server';
import { cn, num } from '@/lib/format';
import { ProductGrid } from '../product/ProductCard';
import { FilterPanel, SortSelect } from './FilterPanel';
import { StoreOffline } from '../layout/StoreOffline';
import { TrackView } from './TrackView';

export type SP = Record<string, string | string[] | undefined>;
const KEYS = ['q', 'category', 'gender', 'fabric', 'occasion', 'color', 'size', 'minPrice', 'maxPrice', 'inStock', 'onSale', 'isNew', 'featured', 'rating', 'tag', 'sort', 'page'];

/** Whitelists query params → API query string (never forwards arbitrary input). */
export function toQuery(sp: SP, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  for (const k of KEYS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s && s.length < 200) q.set(k, s);
  }
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  q.set('limit', '16'); // 16 = full rows on 2- and 4-column grids
  return q;
}

function pageHref(base: string, sp: SP, page: number) {
  const q = new URLSearchParams();
  for (const k of KEYS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s && k !== 'page') q.set(k, s);
  }
  if (page > 1) q.set('page', String(page));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export async function ShopView({ sp, base, lockCategory, header }: { sp: SP; base: string; lockCategory?: string; header: React.ReactNode }) {
  const { lang, t } = await getI18n();
  const data = await api.products(toQuery(sp, lockCategory ? { category: lockCategory } : {}).toString());
  if (!data) return <StoreOffline />;
  const { items, total, page, pages, facets } = data;

  return (
    <div className="container-x pb-16">
      {header}
      <div className="flex gap-10">
        <Suspense>
          <FilterPanelSlot facets={facets} total={total} lock={!!lockCategory} desktopOnly />
        </Suspense>
        <div className="min-w-0 flex-1">
          <div className="sticky top-16 z-30 -mx-4 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-cream/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <p className="text-sm text-mocha" aria-live="polite">{t('shop.results', { n: num(total, lang) })}</p>
            <div className="flex items-center gap-2">
              <Suspense>
                <SortSelect />
              </Suspense>
            </div>
            <Suspense>
              <FilterPanelSlot facets={facets} total={total} lock={!!lockCategory} mobileOnly />
            </Suspense>
          </div>
          <h2 className="sr-only">{t('shop.title')}</h2>
          {items.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-sand px-6 py-20 text-center">
              <SearchX className="h-10 w-10 text-bronze" />
              <p className="mt-4 font-display text-3xl">{t('shop.noResults')}</p>
              <p className="mt-2 max-w-sm text-sm text-mocha">{t('shop.noResultsSub')}</p>
              <Link href={base} className="btn-primary mt-6">{t('shop.clear')}</Link>
            </div>
          ) : (
            <ProductGrid products={items} lang={lang} cols3 priorityCount={4} />
          )}
          {pages > 1 && (
            <nav className="mt-14 flex items-center justify-center gap-2" aria-label={t('shop.page')}>
              {page > 1 && <Link rel="prev" href={pageHref(base, sp, page - 1)} className="chip !min-h-11 !px-3" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Link>}
              {Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1).map((p, i, arr) => (
                <span key={p} className="flex items-center gap-2">
                  {i > 0 && p - arr[i - 1] > 1 && <span className="text-mocha">…</span>}
                  <Link href={pageHref(base, sp, p)} aria-current={p === page ? 'page' : undefined} className={cn('chip !min-h-11 min-w-11 justify-center', p === page && 'chip-on')}>{num(p, lang)}</Link>
                </span>
              ))}
              {page < pages && <Link rel="next" href={pageHref(base, sp, page + 1)} className="chip !min-h-11 !px-3" aria-label="Next"><ChevronRight className="h-4 w-4" /></Link>}
            </nav>
          )}
        </div>
      </div>
      {sp.q && <TrackView name="search" data={{ searchTerm: String(sp.q), contentIds: items.map((i) => i._id) }} />}
    </div>
  );
}

/** FilterPanel renders both desktop aside + mobile trigger; slots pick which half to show by placement. */
function FilterPanelSlot({ facets, total, lock, desktopOnly, mobileOnly }: { facets: import('@/lib/types').Facets; total: number; lock: boolean; desktopOnly?: boolean; mobileOnly?: boolean }) {
  return <FilterPanel facets={facets} total={total} lockCategory={lock} mode={desktopOnly ? 'desktop' : mobileOnly ? 'mobile' : 'both'} />;
}

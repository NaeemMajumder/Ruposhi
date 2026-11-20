'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn, num } from '@/lib/format';

export const PER_PAGE = 15;

/** Client-side paging for lists the API returns in full (my orders, wishlist): 15 per page. */
export function usePaged<T>(rows: T[] | null | undefined, size = PER_PAGE) {
  const [page, setPage] = useState(1);
  const total = rows?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => setPage(1), [total]);
  const current = Math.min(page, pages);
  return { rows: rows?.slice((current - 1) * size, current * size), page: current, pages, setPage };
}

/** Numbered pagination for the storefront: ‹ 1 … 4 5 6 … 12 › — scrolls the list back into view. */
export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const { lang } = useT();
  const ref = useRef<HTMLElement>(null);
  if (pages <= 1) return null;
  const keep = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const go = (p: number) => {
    onPage(p);
    const list = ref.current?.previousElementSibling as HTMLElement | null;
    (list ?? ref.current)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav ref={ref} className="mt-10 flex items-center justify-center gap-2" aria-label={lang === 'bn' ? 'পৃষ্ঠা' : 'Pagination'}>
      <button disabled={page <= 1} onClick={() => go(page - 1)} className="chip !min-h-11 !px-3 disabled:opacity-40" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
      {keep.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - keep[i - 1] > 1 && <span className="text-mocha">…</span>}
          <button onClick={() => p !== page && go(p)} aria-current={p === page ? 'page' : undefined} className={cn('chip !min-h-11 min-w-11 justify-center', p === page && 'chip-on')}>{num(p, lang)}</button>
        </span>
      ))}
      <button disabled={page >= pages} onClick={() => go(page + 1)} className="chip !min-h-11 !px-3 disabled:opacity-40" aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
    </nav>
  );
}

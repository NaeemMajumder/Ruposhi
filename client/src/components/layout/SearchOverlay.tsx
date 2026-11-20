'use client';
import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch } from '@/lib/client-api';
import { money, tr } from '@/lib/format';
import type { I18n } from '@/lib/types';
import { track } from '@/lib/track';

interface Suggest { products: { slug: string; name: I18n; image: string; price: number; category: string }[]; categories: { slug: string; name: I18n }[] }

const TRENDING = ['Jamdani', 'Banarasi', 'Panjabi', 'Eid', 'শাড়ি', 'Lawn'];

/** Full-screen search with live, typo-tolerant suggestions (works with Banglish & Bangla). */
export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Suggest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setRes(null);
      return;
    }
    let ignore = false; // newer keystrokes win; older responses are dropped
    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await apiFetch<Suggest>(`/search/suggest?q=${encodeURIComponent(q.trim())}`);
        if (!ignore) setRes(r);
      } catch {
        /* network error → keep previous suggestions */
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 180);
    return () => {
      ignore = true;
      clearTimeout(id);
    };
  }, [q]);

  const go = (term: string) => {
    if (!term.trim()) return;
    track('search', { searchTerm: term.trim() });
    onOpenChange(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-night/50 backdrop-blur-sm data-[state=closed]:animate-[fadeOut_.25s_ease_forwards] data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-[81] max-h-dvh overflow-y-auto bg-cream pb-8 shadow-2xl outline-none data-[state=open]:animate-[slideInT_.4s_var(--ease-silk)]">
          <Dialog.Title className="sr-only">{t('nav.search')}</Dialog.Title>
          <Dialog.Description className="sr-only">Search products</Dialog.Description>
          <form className="container-x flex items-center gap-3 border-b border-line py-4" onSubmit={(e) => (e.preventDefault(), go(q))} role="search">
            <Search className="h-5 w-5 shrink-0 text-bronze" aria-hidden="true" />
            <label htmlFor="site-search" className="sr-only">{t('nav.search')}</label>
            <input
              id="site-search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === 'bn' ? 'শাড়ি, পাঞ্জাবি, জামদানি… খুঁজুন' : 'Search sarees, panjabi, jamdani…'}
              className="h-12 flex-1 bg-transparent font-display text-2xl placeholder:text-mocha/50 focus:outline-none sm:text-3xl"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={80}
            />
            <Dialog.Close className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label={t('nav.close')}>
              <X className="h-5 w-5" />
            </Dialog.Close>
          </form>
          <div className="container-x pt-6">
            {!res && (
              <div>
                <p className="eyebrow mb-3">Trending</p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING.map((s) => <button key={s} onClick={() => go(s)} className="chip">{s}</button>)}
                </div>
              </div>
            )}
            {loading && !res && <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}</div>}
            {res && (
              <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
                <div>
                  <p className="eyebrow mb-3">{t('shop.category')}</p>
                  {res.categories.length ? (
                    res.categories.map((c) => (
                      <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => onOpenChange(false)} className="flex min-h-11 items-center justify-between border-b border-line font-display text-xl">
                        {tr(c.name, lang)} <ArrowRight className="h-4 w-4 text-bronze" />
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-mocha">—</p>
                  )}
                </div>
                <div>
                  <p className="eyebrow mb-3">{lang === 'bn' ? 'পণ্য' : 'Products'}</p>
                  {res.products.length ? (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {res.products.map((p) => (
                        <li key={p.slug}>
                          <Link href={`/product/${p.slug}`} onClick={() => onOpenChange(false)} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-sand">
                            <span className="arch-soft relative h-16 w-12 shrink-0 overflow-hidden bg-sand">
                              <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{tr(p.name, lang)}</span>
                              <span className="text-sm text-bronze">{money(p.price, lang)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-mocha">{t('shop.noResults')}</p>
                  )}
                  {res.products.length > 0 && (
                    <button onClick={() => go(q)} className="btn-link mt-4">{t('common.viewAll')} <ArrowRight className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

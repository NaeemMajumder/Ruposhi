'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch } from '@/lib/client-api';
import type { Product, ProductList } from '@/lib/types';
import { useWishlist } from '@/store/wishlist';
import { ProductCard } from '../product/ProductCard';
import { GridSk } from '../ui/Skeletons';
import { Pagination, usePaged } from '../ui/Pagination';

/** Device wishlist (works for guests); synced to the account when signed in. */
export function WishlistView() {
  const { t, lang } = useT();
  const ids = useWishlist((s) => s.ids);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Product[] | null>(null);
  useEffect(() => setMounted(true), []);
  const key = ids.join(',');
  useEffect(() => {
    if (!mounted) return;
    if (!key) return setItems([]);
    apiFetch<ProductList>(`/products?ids=${encodeURIComponent(key)}&limit=60`).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [key, mounted]);
  // removing a heart drops the card immediately
  const shown = items?.filter((p) => ids.includes(p._id));
  const paged = usePaged(shown, 16); // product grid: 16 fills every row
  return (
    <div className="container-x pb-20 pt-8">
      <h1 className="h-display animate-rise text-[44px] sm:text-[60px]">{t('nav.wishlist')}</h1>
      <div className="mt-8">
        {!shown ? (
          <GridSk n={4} />
        ) : shown.length === 0 ? (
          <div className="flex animate-scale-in flex-col items-center rounded-[32px] bg-sand px-6 py-20 text-center">
            <Heart className="h-10 w-10 animate-pop text-maroon" />
            <p className="mt-4 font-display text-3xl">{lang === 'bn' ? 'উইশলিস্ট খালি' : 'Nothing saved yet'}</p>
            <p className="mt-2 text-mocha">{lang === 'bn' ? 'পছন্দের পোশাকে ♡ চাপুন — এখানে জমা থাকবে।' : 'Tap ♡ on any piece to keep it here.'}</p>
            <Link href="/shop" className="btn-primary mt-6">{t('cart.continueShopping')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {paged.rows!.map((p, k) => <div key={p._id} style={{ animation: `rise .6s var(--ease-silk) ${k * 50}ms both` }}><ProductCard p={p} lang={lang} /></div>)}
          </div>
        )}
        {shown && shown.length > 0 && (
          <Pagination page={paged.page} pages={paged.pages} onPage={paged.setPage} />
        )}
      </div>
    </div>
  );
}

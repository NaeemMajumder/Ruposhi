'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';
import { apiFetch } from '@/lib/client-api';
import type { Product, ProductList } from '@/lib/types';
import { useWishlist } from '@/store/wishlist';
import { ProductRail } from '../home/Sections';
import { GridSk } from '../ui/Skeletons';

/** Client-only (per-device history) → rendered after mount with a skeleton. */
export function RecentlyViewed({ exclude }: { exclude?: string }) {
  const { t, lang } = useT();
  const recent = useWishlist((s) => s.recent);
  const [items, setItems] = useState<Product[] | null>(null);
  const slugs = recent.filter((s) => s !== exclude).slice(0, 8);
  const key = slugs.join(',');
  useEffect(() => {
    if (!key) return setItems([]);
    apiFetch<ProductList>(`/products?slugs=${encodeURIComponent(key)}&limit=8`)
      .then((r) => setItems(key.split(',').map((s) => r.items.find((p) => p.slug === s)).filter(Boolean) as Product[]))
      .catch(() => setItems([]));
  }, [key]);
  if (items && items.length === 0) return null;
  return (
    <section className="border-t border-line py-14">
      <h2 className="h-display mb-8 text-[36px] sm:text-[44px]">{t('product.recentlyViewed')}</h2>
      {items ? <ProductRail products={items.slice(0, 4)} lang={lang} /> : <GridSk n={4} />}
    </section>
  );
}

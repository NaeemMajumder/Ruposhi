'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Lock, ShoppingBag } from 'lucide-react';
import { useT } from '@/i18n/client';
import type { Product } from '@/lib/types';
import { useCart } from '@/store/cart';
import { FreeShippingBar, useQuote } from '../layout/CartDrawer';
import { ProductCard } from '../product/ProductCard';
import { Breadcrumbs } from '../shop/PageHeader';
import { FormSk } from '../ui/Skeletons';
import { CartLine } from './CartLine';
import { CouponBox, GiftWrap, Totals } from './Summary';

export function CartView({ giftWrapFee, suggestions }: { giftWrapFee: number; suggestions: Product[] }) {
  const { t, lang } = useT();
  const { items, couponCode, giftWrap } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { quote, loading } = useQuote({ couponCode: couponCode || undefined, giftWrap }, mounted);

  if (!mounted) return <FormSk />;

  return (
    <div className="container-x pb-20 pt-5 sm:pt-8">
      <Breadcrumbs crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('cart.title') }]} />
      <h1 className="h-display mt-6 animate-rise text-[44px] sm:text-[60px]">{t('cart.title')}</h1>

      {items.length === 0 ? (
        <div className="mt-10 flex animate-scale-in flex-col items-center rounded-[32px] bg-sand px-6 py-20 text-center">
          <span className="arch grid h-32 w-28 place-items-center bg-cream"><ShoppingBag className="h-10 w-10 animate-float text-bronze" /></span>
          <p className="mt-6 font-display text-4xl">{t('cart.empty')}</p>
          <p className="mt-2 max-w-sm text-mocha">{t('cart.emptySub')}</p>
          <Link href="/shop" className="btn-primary mt-8">{t('cart.continueShopping')} <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
          <div>
            {quote && <FreeShippingBar quote={quote} />}
            <ul className="mt-2 divide-y divide-line">
              {items.map((i, k) => <CartLine key={i.sku} item={i} line={quote?.lines.find((l) => l.sku === i.sku)} large index={k} />)}
            </ul>
            <div className="mt-6"><GiftWrap fee={giftWrapFee} /></div>
          </div>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card animate-scale-in space-y-5 p-5 sm:p-6">
              <h2 className="font-display text-2xl">{t('checkout.summary')}</h2>
              <CouponBox quote={quote} />
              <Totals quote={quote} loading={loading} />
              <Link href="/checkout" aria-disabled={quote?.hasIssues} className={`btn-primary h-13 w-full text-base ${quote?.hasIssues ? 'pointer-events-none opacity-50' : ''}`}>
                <Lock className="h-4 w-4" /> {t('cart.checkout')}
              </Link>
              <p className="text-center text-xs text-mocha">{t('cart.secure')}</p>
            </div>
            <Link href="/shop" className="btn-link mx-auto mt-4 flex w-fit">{t('cart.continueShopping')}</Link>
          </aside>
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="mt-20 border-t border-line pt-14">
          <h2 className="h-display mb-8 text-[36px] sm:text-[44px]">{t('product.related')}</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-4 lg:gap-x-6">
            {suggestions.map((p) => <ProductCard key={p._id} p={p} lang={lang} />)}
          </div>
        </section>
      )}
    </div>
  );
}

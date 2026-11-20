'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShoppingBag, Truck } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch } from '@/lib/client-api';
import { money } from '@/lib/format';
import type { Quote } from '@/lib/types';
import { useCart } from '@/store/cart';
import { Sheet } from '../ui/Sheet';
import { CartLine } from '../cart/CartLine';

/** Validates the bag against live prices/stock (server is the source of truth). */
export function useQuote(extra: Record<string, unknown> = {}, enabled = true) {
  const items = useCart((s) => s.items);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({ items: items.map((i) => [i.slug, i.sku, i.qty]), extra });
  useEffect(() => {
    if (!enabled || !items.length) {
      setQuote(null);
      return;
    }
    let ignore = false;
    setLoading(true);
    const id = setTimeout(() => {
      apiFetch<Quote>('/cart/quote', { body: { items: items.map(({ slug, sku, qty }) => ({ slug, sku, qty })), ...extra } })
        .then((q) => {
          if (ignore) return;
          setQuote(q);
          setError(null);
        })
        .catch((e: Error) => {
          if (!ignore) setError(e.message);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 150);
    return () => {
      ignore = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return { quote, loading, error };
}

export function FreeShippingBar({ quote }: { quote: Quote }) {
  const { t, lang } = useT();
  const pct = Math.min(100, ((quote.freeShipping.threshold - quote.freeShipping.remaining) / quote.freeShipping.threshold) * 100);
  return (
    <div className="rounded-2xl bg-sand px-4 py-3">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        <Truck className="h-4 w-4 text-bronze" aria-hidden="true" />
        {quote.freeShipping.unlocked ? t('cart.freeUnlocked') : t('cart.freeRemaining', { amount: money(quote.freeShipping.remaining, lang) })}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-bronze transition-[width] duration-1000 ease-[var(--ease-silk)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LineIssue({ issue, available }: { issue?: string; available: number }) {
  const { t } = useT();
  if (!issue) return null;
  const msg = issue === 'out_of_stock' ? t('cart.outOfStock') : issue === 'qty_reduced' ? t('cart.qtyReduced', { n: available }) : t('cart.unavailable');
  return <p className="mt-1 text-xs font-medium text-maroon">{msg}</p>;
}

export function CartDrawer() {
  const { t, lang } = useT();
  const { items, open, setOpen } = useCart();
  const { quote } = useQuote({}, open);
  const issueOf = (sku: string) => quote?.lines.find((l) => l.sku === sku);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={`${t('cart.title')}${items.length ? ` (${items.reduce((s, i) => s + i.qty, 0)})` : ''}`}
      footer={
        items.length ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-mocha">{t('cart.subtotal')}</span>
              <span className="text-xl font-semibold">{money(quote?.subtotal ?? items.reduce((s, i) => s + i.price * i.qty, 0), lang)}</span>
            </div>
            <p className="text-xs text-mocha">{t('cart.deliveryCalc')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={() => setOpen(false)} className="btn-ghost">{t('cart.viewBag')}</Link>
              <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary" aria-disabled={quote?.hasIssues}>{t('cart.checkout')}</Link>
            </div>
          </div>
        ) : null
      }
    >
      {!items.length ? (
        <div className="flex flex-col items-center px-8 py-16 text-center">
          <span className="arch grid h-28 w-24 animate-scale-in place-items-center bg-sand"><ShoppingBag className="h-8 w-8 animate-float text-bronze" /></span>
          <p className="mt-6 font-display text-3xl">{t('cart.empty')}</p>
          <p className="mt-2 text-sm text-mocha">{t('cart.emptySub')}</p>
          <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary mt-6">{t('cart.continueShopping')}</Link>
        </div>
      ) : (
        <div className="space-y-4 px-5 py-4">
          {quote && <FreeShippingBar quote={quote} />}
          <ul className="divide-y divide-line">
            {items.map((i, k) => <CartLine key={i.sku} item={i} line={issueOf(i.sku)} index={k} onNavigate={() => setOpen(false)} />)}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

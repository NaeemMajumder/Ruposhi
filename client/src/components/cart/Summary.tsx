'use client';
import { useState } from 'react';
import { Check, Gift, Loader2, Tag, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn, money, tr } from '@/lib/format';
import type { Quote } from '@/lib/types';
import { useCart } from '@/store/cart';
import { CountUp } from '../ui/CountUp';

/** Coupon input → validated by the server inside /cart/quote (never trusted client-side). */
export function CouponBox({ quote }: { quote: Quote | null }) {
  const { t, lang } = useT();
  const { couponCode, setCoupon } = useCart();
  const [v, setV] = useState('');
  const c = quote?.coupon;
  if (couponCode && c)
    return (
      <div className={cn('flex animate-scale-in items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm', c.valid ? 'border-success/40 bg-success/5' : 'border-maroon/40 bg-maroon/5')}>
        <div className="flex gap-2">
          {c.valid ? <Check className="mt-0.5 h-4 w-4 text-success" /> : <X className="mt-0.5 h-4 w-4 text-maroon" />}
          <div>
            <p className="font-semibold tracking-wider">{couponCode}</p>
            <p className="text-xs text-mocha">{c.valid ? tr(c.coupon?.description, lang) || `−${money(c.discount, lang)}` : c.reason}</p>
          </div>
        </div>
        <button onClick={() => setCoupon('')} className="text-xs font-semibold text-bronze underline-offset-2 hover:underline">{t('common.remove')}</button>
      </div>
    );
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) setCoupon(v.trim().toUpperCase());
      }}
    >
      <label className="relative flex-1">
        <span className="sr-only">{t('cart.couponPlaceholder')}</span>
        <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
        <input value={v} onChange={(e) => setV(e.target.value.toUpperCase())} maxLength={30} placeholder={t('cart.couponPlaceholder')} className="field !pl-11 uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal" />
      </label>
      <button disabled={!v.trim()} className="btn-ghost shrink-0">{t('common.apply')}</button>
    </form>
  );
}

export function GiftWrap({ fee }: { fee: number }) {
  const { t, lang } = useT();
  const { giftWrap, setGiftWrap } = useCart();
  return (
    <label className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition', giftWrap ? 'border-gold bg-gold/10' : 'border-line hover:border-bronze')}>
      <input type="checkbox" checked={giftWrap} onChange={(e) => setGiftWrap(e.target.checked)} className="peer sr-only" />
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full transition', giftWrap ? 'bg-gold text-night' : 'bg-sand text-bronze')}>
        <Gift key={String(giftWrap)} className={cn('h-5 w-5', giftWrap && 'animate-pop')} />
      </span>
      <span className="flex-1 text-sm">
        <span className="block font-semibold">{t('cart.giftWrapAsk')} · {money(fee, lang)}</span>
        <span className="text-xs text-mocha">{t('cart.giftWrapNote')}</span>
      </span>
      <span className={cn('relative h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold', giftWrap ? 'bg-espresso' : 'bg-line')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-all duration-300 ease-[var(--ease-out-back)]', giftWrap ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </label>
  );
}

export function Totals({ quote, loading, showDelivery = false }: { quote: Quote | null; loading?: boolean; showDelivery?: boolean }) {
  const { t, lang } = useT();
  const row = (label: string, value: React.ReactNode, cls = '') => (
    <div className={cn('flex items-baseline justify-between gap-4', cls)}>
      <dt className="text-mocha">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
  if (!quote) return <div className="space-y-3">{[1, 2, 3].map((k) => <div key={k} className="skeleton h-4" />)}</div>;
  return (
    <dl className={cn('space-y-2.5 text-sm transition-opacity', loading && 'opacity-60')}>
      {row(t('cart.subtotal'), money(quote.subtotal, lang))}
      {quote.discount > 0 && row(t('cart.discount'), <span className="text-success">−{money(quote.discount, lang)}</span>, 'animate-fade')}
      {quote.giftWrap > 0 && row(t('cart.giftWrap'), money(quote.giftWrap, lang), 'animate-fade')}
      {row(t('cart.delivery'), quote.deliveryCharge == null ? <span className="text-xs text-mocha">{showDelivery ? '—' : t('cart.deliveryCalc')}</span> : quote.deliveryCharge === 0 ? <span className="font-semibold text-success">{t('common.free')}</span> : money(quote.deliveryCharge, lang))}
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-semibold">{t('cart.total')}</dt>
        <dd className="font-display text-3xl font-semibold">
          {loading ? <Loader2 className="inline h-5 w-5 animate-spin text-mocha" /> : <CountUp key={quote.total} value={quote.total} duration={500} format={(n) => money(Math.round(n), lang)} />}
        </dd>
      </div>
    </dl>
  );
}

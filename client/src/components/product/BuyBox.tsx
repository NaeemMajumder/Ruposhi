'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Banknote, Check, Minus, Plus, RefreshCcw, Share2, ShoppingBag, Truck, Zap } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, money, num, toBnDigits, tr } from '@/lib/format';
import { flyToCart, shake } from '@/lib/motion';
import { track } from '@/lib/track';
import type { Product, PublicSettings } from '@/lib/types';
import { useCart } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { Countdown } from '../ui/Countdown';
import { Price, Stars } from '../ui/Price';
import { toast } from '../ui/Toast';
import { SizeGuideButton } from './SizeGuide';
import { WishButton } from './WishButton';

export function BuyBox({ p, delivery }: { p: Product; delivery: PublicSettings['delivery'] | null }) {
  const { t, lang } = useT();
  const router = useRouter();
  const add = useCart((s) => s.add);
  const pushRecent = useWishlist((s) => s.pushRecent);
  const multiColor = p.colors.length > 1;
  const singleSize = p.sizes.length === 1;
  const [color, setColor] = useState(p.colors.find((c) => p.variants.some((v) => v.color === c.name.en && v.stock > 0))?.name.en ?? p.colors[0]?.name.en ?? '');
  const [size, setSize] = useState(singleSize ? p.sizes[0] : '');
  const [qty, setQty] = useState(1);
  const [zone, setZone] = useState<'inside' | 'outside'>('inside');
  const [added, setAdded] = useState(false);
  const sizesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const variant = p.variants.find((v) => v.color === color && v.size === size);
  const stockOf = (s: string) => p.variants.find((v) => v.color === color && v.size === s)?.stock ?? 0;
  const available = variant ? variant.stock : 0;
  const soldOut = !p.inStock && !p.preOrder;
  const canBuy = p.preOrder || (variant ? variant.stock > 0 : p.inStock);
  const name = tr(p.name, lang);

  useEffect(() => {
    pushRecent(p.slug);
    track('view_content', { productSlug: p.slug, contentIds: [p._id], value: p.price });
  }, [p.slug, p._id, p.price, pushRecent]);

  // sticky add-to-bag on mobile when the main CTA scrolls away
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const doAdd = (buyNow: boolean) => {
    if (!size) {
      toast.error(t('product.selectSize'));
      shake(sizesRef.current);
      sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    const v = variant ?? p.variants.find((x) => x.size === size);
    if (!v) return false;
    add({ slug: p.slug, sku: v.sku, qty: Math.min(qty, p.preOrder ? 10 : Math.max(1, v.stock)), name: p.name, image: p.images[0]?.url ?? '', price: p.price, size, color: v.color, preOrder: p.preOrder }, false);
    track('add_to_cart', { productSlug: p.slug, contentIds: [p._id], value: p.price * qty });
    if (buyNow) {
      router.push('/checkout');
    } else {
      flyToCart(document.querySelector<HTMLElement>('[data-gallery]'));
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
      toast.success(`${t('common.added')} · ${name}`);
    }
    return true;
  };

  const share = async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.info(t('common.copied'));
      }
    } catch {
      /* user cancelled */
    }
  };

  const fee = delivery ? (zone === 'inside' ? delivery.insideDhaka : delivery.outsideDhaka) : 0;
  const free = delivery && p.price * qty >= delivery.freeShippingThreshold;
  const days = delivery ? (zone === 'inside' ? delivery.insideDays : delivery.outsideDays) : '';

  return (
    <div className="stagger">
      <div className="flex items-start justify-between gap-4">
        <p className="eyebrow">{p.fabric}</p>
        <div className="flex gap-1">
          <WishButton productId={p._id} name={name} className="!bg-sand !shadow-none" />
          <button onClick={share} className="grid h-10 w-10 place-items-center rounded-full bg-sand transition hover:scale-110 active:scale-90" aria-label={t('product.share')}>
            <Share2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      <h1 className="h-display mt-2 text-[36px] sm:text-[48px]">{name}</h1>
      {p.reviewCount > 0 && (
        <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-mocha hover:text-espresso">
          <Stars value={p.rating} /> <span>{lang === 'bn' ? toBnDigits(p.rating.toFixed(1)) : p.rating.toFixed(1)}</span>
          <span className="u-line">({num(p.reviewCount, lang)} {t('common.reviews')})</span>
          {p.soldCount > 20 && <span className="hidden sm:inline">· {num(p.soldCount, lang)}+ {lang === 'bn' ? 'বিক্রি' : 'sold'}</span>}
        </a>
      )}

      <div className="mt-5">
        <Price price={p.price} compare={p.compareAtPrice ?? (p.regularPrice > p.price ? p.regularPrice : undefined)} lang={lang} size="lg" />
        <p className="mt-1 text-xs text-mocha">{lang === 'bn' ? 'ভ্যাটসহ মূল্য' : 'Price includes VAT'}</p>
      </div>

      {p.flashSale && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-night p-4 text-ivory">
          <span className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 animate-pulse fill-gold text-gold" /> {t('product.flashEnds')}</span>
          <Countdown endsAt={p.flashSale.endsAt} tone="light" />
        </div>
      )}

      <p className="mt-5 text-[15px] leading-relaxed text-mocha">{tr(p.shortDescription, lang)}</p>

      {multiColor && (
        <fieldset className="mt-6">
          <legend className="mb-3 text-sm"><span className="font-semibold">{t('product.color')}:</span> {tr(p.colors.find((c) => c.name.en === color)?.name, lang)}</legend>
          <div className="flex flex-wrap gap-2">
            {p.colors.map((c) => (
              <button key={c.name.en} onClick={() => { setColor(c.name.en); setSize(singleSize ? p.sizes[0] : ''); }} aria-pressed={color === c.name.en} aria-label={tr(c.name, lang)} className={cn('grid h-11 w-11 place-items-center rounded-full border-2 transition', color === c.name.en ? 'scale-110 border-espresso' : 'border-transparent hover:scale-105')}>
                <span className="h-8 w-8 rounded-full border border-line" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {!singleSize && (
        <fieldset className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <legend className="text-sm font-semibold">{t('product.size')}{size && <span className="font-normal text-mocha">: {size}</span>}</legend>
            <SizeGuideButton category={p.category} />
          </div>
          <div ref={sizesRef} className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('product.size')}>
            {p.sizes.map((s) => {
              const st = stockOf(s);
              const off = st <= 0 && !p.preOrder;
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={size === s}
                  disabled={off}
                  onClick={() => setSize(s)}
                  className={cn(
                    'relative min-h-12 min-w-14 rounded-xl border px-4 text-sm font-semibold transition-all duration-300 active:scale-95',
                    size === s ? 'border-espresso bg-espresso text-cream shadow-lg shadow-espresso/15' : 'border-line bg-surface hover:border-bronze',
                    off && 'cursor-not-allowed text-mocha/50 line-through decoration-1 hover:border-line',
                  )}
                >
                  {s}
                  {!off && st > 0 && st <= 2 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-maroon ring-2 ring-cream" title={t('product.lowStock', { n: st })} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {singleSize && (
        <div className="mt-6 flex items-center justify-between rounded-xl bg-sand px-4 py-3 text-sm">
          <span><span className="font-semibold">{t('product.size')}:</span> {p.sizes[0]}</span>
          <SizeGuideButton category={p.category} />
        </div>
      )}

      {variant && variant.stock > 0 && variant.stock <= 3 && <p className="mt-3 flex animate-fade items-center gap-2 text-sm font-semibold text-maroon"><span className="h-2 w-2 animate-pulse rounded-full bg-maroon" />{t('product.lowStock', { n: variant.stock })}</p>}
      {p.preOrder && <p className="mt-3 rounded-xl border border-dashed border-gold px-4 py-3 text-sm">{t('product.preOrderNote')}</p>}

      <div ref={ctaRef} className="mt-6">
        {soldOut || (variant && !canBuy) ? (
          <NotifyMe slug={p.slug} size={size} color={color} />
        ) : (
          <>
            <div className="flex gap-3">
              <div className="inline-flex h-12 items-center rounded-full border border-line bg-surface">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-11 place-items-center rounded-full transition hover:bg-sand active:scale-90" aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{num(qty, lang)}</span>
                <button onClick={() => setQty((q) => Math.min(p.preOrder ? 10 : Math.max(1, Math.min(10, available || 10)), q + 1))} className="grid h-12 w-11 place-items-center rounded-full transition hover:bg-sand active:scale-90" aria-label="Increase"><Plus className="h-4 w-4" /></button>
              </div>
              <button onClick={() => doAdd(false)} className={cn('btn-primary h-12 flex-1 overflow-hidden', added && '!bg-success !text-ivory')}>
                <span key={String(added)} className="inline-flex animate-scale-in items-center gap-2">
                  {added ? <><Check className="h-4 w-4" /> {t('common.added')}</> : <><ShoppingBag className="h-4 w-4" /> {p.preOrder ? t('common.preOrder') : t('common.addToBag')}</>}
                </span>
              </button>
            </div>
            <button onClick={() => doAdd(true)} className="btn-gold mt-3 h-12 w-full">{t('common.buyNow')}</button>
          </>
        )}
      </div>

      {delivery && (
        <div className="mt-6 rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4 text-bronze" /> {t('product.estimate')}</span>
            <div className="inline-flex rounded-full bg-sand p-0.5 text-xs font-semibold">
              {(['inside', 'outside'] as const).map((z) => (
                <button key={z} onClick={() => setZone(z)} className={cn('min-h-8 rounded-full px-3 transition', zone === z ? 'bg-espresso text-cream' : 'text-mocha')}>{z === 'inside' ? (lang === 'bn' ? 'ঢাকা' : 'Dhaka') : (lang === 'bn' ? 'ঢাকার বাইরে' : 'Outside')}</button>
              ))}
            </div>
          </div>
          <p key={zone} className="mt-3 animate-fade text-sm text-mocha">
            {zone === 'inside' ? t('product.insideDhaka', { days }) : t('product.outsideDhaka', { days })} · {free ? <span className="font-semibold text-success">{t('common.free')}</span> : money(fee, lang)}
          </p>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[11.5px] leading-tight text-mocha">
        {[[Banknote, t('product.cod')], [RefreshCcw, t('product.exchange')], [BadgeCheck, t('product.authentic')]].map(([I, l], k) => {
          const Icon = I as typeof Banknote;
          return (
            <li key={k} className="lift flex flex-col items-center gap-1.5 rounded-xl bg-blush px-2 py-3">
              <Icon className="h-5 w-5 text-bronze" />
              {l as string}
            </li>
          );
        })}
      </ul>

      {/* sticky mobile bar */}
      {!soldOut && (
        <div className={cn('fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-500 ease-[var(--ease-silk)] lg:hidden', showSticky ? 'translate-y-0' : 'translate-y-full')} aria-hidden={!showSticky}>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="text-sm text-bronze">{money(p.price, lang)}{size && <span className="text-mocha"> · {size}</span>}</p>
            </div>
            <button tabIndex={showSticky ? 0 : -1} onClick={() => doAdd(false)} className="btn-primary h-12 shrink-0">
              <ShoppingBag className="h-4 w-4" /> {p.preOrder ? t('common.preOrder') : t('common.addToBag')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotifyMe({ slug, size, color }: { slug: string; size: string; color: string }) {
  const { t, lang } = useT();
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const ref = useRef<HTMLFormElement>(null);
  if (state === 'done')
    return <p className="flex animate-scale-in items-center gap-2 rounded-2xl bg-sand p-4 text-sm font-semibold text-success"><Check className="h-5 w-5" /> {t('product.notifyDone')}</p>;
  return (
    <form
      ref={ref}
      className="rounded-2xl bg-sand p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setState('busy');
        try {
          await apiFetch(`/products/${slug}/notify`, { body: { phone, size: size || undefined, color: color || undefined } });
          setState('done');
        } catch (err) {
          setState('idle');
          shake(ref.current);
          toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
        }
      }}
    >
      <p className="font-semibold">{t('common.soldOut')} — {t('product.notifyTitle')}</p>
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="notify-phone">Phone</label>
        <input id="notify-phone" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={lang === 'bn' ? '০১XXXXXXXXX' : '01XXXXXXXXX'} className="field flex-1" />
        <button disabled={state === 'busy'} className="btn-primary">{state === 'busy' ? '…' : t('common.notifyMe')}</button>
      </div>
    </form>
  );
}

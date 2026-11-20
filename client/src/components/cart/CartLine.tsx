'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn, money, num, tr } from '@/lib/format';
import type { QuoteLine } from '@/lib/types';
import { useCart, type CartItem } from '@/store/cart';
import { LineIssue } from '../layout/CartDrawer';

/** One bag line. Removal collapses + fades out (WAAPI) before the item leaves the store. */
export function CartLine({ item: i, line, onNavigate, large, index = 0 }: { item: CartItem; line?: QuoteLine; onNavigate?: () => void; large?: boolean; index?: number }) {
  const { t, lang } = useT();
  const { setQty, remove } = useCart();
  const ref = useRef<HTMLLIElement>(null);
  const price = line?.price ?? i.price;

  const drop = () => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return remove(i.sku);
    const h = el.offsetHeight;
    el.animate(
      [
        { opacity: 1, transform: 'none', height: `${h}px` },
        { opacity: 0, transform: 'translateX(40px)', height: `${h}px`, offset: 0.55 },
        { opacity: 0, transform: 'translateX(40px)', height: '0px', paddingTop: '0px', paddingBottom: '0px' },
      ],
      { duration: 420, easing: 'cubic-bezier(.4,0,.2,1)' },
    ).onfinish = () => remove(i.sku);
  };

  return (
    <li ref={ref} className="flex animate-[rise_.5s_var(--ease-silk)_both] gap-3 overflow-hidden py-4 sm:gap-4" style={{ animationDelay: `${index * 50}ms` }}>
      <Link href={`/product/${i.slug}`} onClick={onNavigate} className={cn('arch-soft media relative shrink-0 overflow-hidden', large ? 'h-[132px] w-[100px] sm:h-[160px] sm:w-[120px]' : 'h-[104px] w-[78px]')}>
        <Image src={i.image} alt={tr(i.name, lang)} fill sizes="120px" className="object-cover transition duration-500 hover:scale-105" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <Link href={`/product/${i.slug}`} onClick={onNavigate} className={cn('line-clamp-2 font-medium leading-snug hover:text-bronze', large ? 'text-[15px] sm:text-base' : 'text-sm')}>{tr(i.name, lang)}</Link>
          <button onClick={drop} className="-mr-2 -mt-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-mocha transition hover:bg-sand hover:text-maroon active:scale-90" aria-label={`${t('common.remove')} ${tr(i.name, lang)}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-mocha">{i.color} · {i.size}{i.preOrder ? ` · ${t('common.preOrder')}` : ''}</p>
        <LineIssue issue={line?.issue} available={line?.available ?? 0} />
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="inline-flex items-center rounded-full border border-line bg-surface">
            <button onClick={() => setQty(i.sku, i.qty - 1)} disabled={i.qty <= 1} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-sand active:scale-90 disabled:opacity-30" aria-label="Decrease quantity"><Minus className="h-3.5 w-3.5" /></button>
            <span key={i.qty} className="w-6 animate-flip text-center text-sm tabular-nums" aria-live="polite">{num(i.qty, lang)}</span>
            <button onClick={() => setQty(i.sku, i.qty + 1)} disabled={i.qty >= 10} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-sand active:scale-90 disabled:opacity-30" aria-label="Increase quantity"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold">{money(price * i.qty, lang)}</span>
            {large && i.qty > 1 && <p className="text-xs text-mocha">{money(price, lang)} × {num(i.qty, lang)}</p>}
          </div>
        </div>
      </div>
    </li>
  );
}

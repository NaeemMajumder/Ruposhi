'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, Home, LayoutGrid, ShoppingBag, User } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn } from '@/lib/format';
import { cartCount, useCart } from '@/store/cart';

/** Thumb-zone bottom navigation for phones. Hidden on checkout and product pages (they have their own sticky bar). */
export function MobileNav() {
  const { t } = useT();
  const path = usePathname();
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (path.startsWith('/checkout') || path.startsWith('/product/') || path.startsWith('/admin')) return null;
  const count = m ? cartCount(items) : 0;
  const links = [
    { href: '/', icon: Home, label: t('nav.home') },
    { href: '/shop', icon: LayoutGrid, label: t('nav.shop') },
    { href: '/wishlist', icon: Heart, label: t('nav.wishlist') },
    { href: '/account', icon: User, label: t('nav.account') },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden" aria-label="Quick">
      <ul className="grid grid-cols-5">
        {links.map(({ href, icon: I, label }) => {
          const on = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} className={cn('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors active:scale-95', on ? 'text-espresso' : 'text-mocha')} aria-current={on ? 'page' : undefined}>
                <span className={cn('absolute top-0 h-0.5 rounded-full bg-gold transition-all duration-500 ease-[var(--ease-silk)]', on ? 'w-8 opacity-100' : 'w-0 opacity-0')} aria-hidden="true" />
                <I className={cn('h-5 w-5 transition-transform duration-300', on && 'text-bronze -translate-y-0.5')} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button data-cart-target="" onClick={() => setOpen(true)} className="relative flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-mocha">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            {t('nav.cart')}
            {count > 0 && <span key={count} className="motion-safe:animate-bump absolute right-[calc(50%-18px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-espresso px-1 text-[10px] font-bold text-cream">{count}</span>}
          </button>
        </li>
      </ul>
    </nav>
  );
}

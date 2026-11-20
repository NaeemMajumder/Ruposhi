'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, ChevronRight } from 'lucide-react';
import { useSetLang, useT } from '@/i18n/client';
import { cn, tr } from '@/lib/format';
import type { Category } from '@/lib/types';
import { cartCount, useCart } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { useUser } from '@/store/auth';
import { Logo } from '../ui/Logo';
import { Sheet } from '../ui/Sheet';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { SearchOverlay } from './SearchOverlay';

const OCCASIONS = ['wedding', 'eid', 'gaye-holud', 'party', 'festive', 'office'];

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

export function LangToggle({ className }: { className?: string }) {
  const { lang } = useT();
  const setLang = useSetLang();
  return (
    <div className={cn('inline-flex rounded-full border border-line bg-surface p-0.5 text-[12px] font-semibold', className)} role="group" aria-label="Language">
      {(['en', 'bn'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn('min-h-8 min-w-10 rounded-full px-2.5 transition', lang === l ? 'bg-espresso text-cream' : 'text-mocha hover:text-espresso')}
        >
          {l === 'en' ? 'EN' : 'বাং'}
        </button>
      ))}
    </div>
  );
}

export function Header({ categories }: { categories: Category[] }) {
  const { t, lang } = useT();
  const pathname = usePathname();
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const wish = useWishlist((s) => s.ids.length);
  const { user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [mega, setMega] = useState(false);
  // mega menu DOM is mounted on first hover only (keeps mobile DOM/hydration light)
  const [megaMounted, setMegaMounted] = useState(false);
  useEffect(() => {
    if (mega) setMegaMounted(true);
  }, [mega]);
  const count = mounted ? cartCount(items) : 0;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    setMenu(false);
    setMega(false);
  }, [pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea'))) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const nav = [
    { href: '/shop', label: t('nav.shop'), mega: true },
    ...categories.map((c) => ({ href: `/category/${c.slug}`, label: tr(c.name, lang), mega: false })),
    { href: '/journal', label: t('nav.journal'), mega: false },
  ];

  return (
    <>
      <header
        className={cn('sticky top-0 z-50 border-b transition-[background,box-shadow,border-color] duration-300', scrolled ? 'border-line bg-cream/92 shadow-[0_6px_24px_-18px_rgba(44,24,16,.5)] backdrop-blur-md' : 'border-transparent bg-cream')}
        onMouseLeave={() => setMega(false)}
      >
        {/* mobile: menu · logo (centre) · icons — desktop: logo (left) · nav · icons */}
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center sm:h-[72px] lg:flex lg:gap-4 xl:gap-8">
          {/* left (mobile) / nav (desktop) */}
          <div className="flex items-center gap-1 lg:order-2 lg:flex-1 lg:justify-center">
            <button className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand lg:hidden" onClick={() => setMenu(true)} aria-label={t('nav.menu')}>
              <Menu className="h-5 w-5" />
            </button>
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onMouseEnter={() => setMega(n.mega)}
                  onFocus={() => setMega(n.mega)}
                  className={cn('relative whitespace-nowrap px-2 py-2 text-[13px] xl:px-3 font-medium tracking-wide text-espresso/85 transition hover:text-espresso',
                    pathname.startsWith(n.href) && 'text-espresso after:absolute after:inset-x-2 after:-bottom-0.5 xl:after:inset-x-3 after:h-px after:bg-gold')}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          {/* logo */}
          <Link href="/" className="justify-self-center lg:order-1 lg:shrink-0" aria-label="Ruposhi — home">
            <Logo />
          </Link>
          {/* right */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1 lg:order-3 lg:shrink-0">
            <span className="mr-1 hidden sm:block"><LangToggle /></span>
            <ThemeToggle className="hidden sm:grid" />
            <button onClick={() => setSearch(true)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label={t('nav.search')}>
              <Search className="h-5 w-5" />
            </button>
            <Link href={user ? '/account' : '/login'} className="hidden h-11 w-11 place-items-center rounded-full hover:bg-sand sm:grid" aria-label={user ? `${t('nav.account')}: ${user.name}` : t('account.signIn')}>
              {mounted && user ? (
                <span className="grid h-8 w-8 animate-pop place-items-center rounded-full bg-espresso text-xs font-bold text-cream">{user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
            <Link href="/wishlist" className="relative hidden h-11 w-11 place-items-center rounded-full hover:bg-sand sm:grid" aria-label={t('nav.wishlist')}>
              <Heart className="h-5 w-5" />
              {mounted && wish > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-espresso">{wish}</span>}
            </Link>
            <button data-cart-target="" onClick={() => setOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-sand" aria-label={`${t('nav.cart')} (${count})`}>
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && <span key={count} className="motion-safe:animate-bump absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-espresso px-1 text-[10px] font-bold text-cream">{count}</span>}
            </button>
          </div>
        </div>

        {/* desktop mega menu */}
        {megaMounted && <div className={cn('animate-fade absolute inset-x-0 top-full hidden border-b border-line bg-cream shadow-xl transition duration-300 lg:block', mega ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0')}>
          <div className="container-x grid grid-cols-[1fr_3fr] gap-10 py-8">
            <div>
              <p className="eyebrow mb-4">{t('nav.occasions')}</p>
              <ul className="space-y-2.5">
                {OCCASIONS.map((o) => (
                  <li key={o}>
                    <Link href={`/shop?occasion=${o}`} className="inline-flex min-h-10 items-center font-display text-xl hover:text-bronze">{t(`occ.${o}`)}</Link>
                  </li>
                ))}
                <li className="pt-2"><Link href="/shop?isNew=true" className="btn-link">{t('nav.newIn')} <ChevronRight className="h-4 w-4" /></Link></li>
              </ul>
            </div>
            <div className="grid grid-cols-4 gap-5">
              {categories.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} className="group">
                  <div className="arch relative aspect-[3/4] overflow-hidden bg-sand">
                    <Image src={c.image} alt="" fill sizes="220px" className="object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                  <p className="mt-3 text-center font-display text-xl">{tr(c.name, lang)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>}
      </header>

      {/* mobile menu */}
      <Sheet open={menu} onOpenChange={setMenu} side="left" title={t('nav.menu')}>
        <nav className="flex flex-col px-5 py-4" aria-label="Mobile">
          <Link href="/shop" className="flex min-h-14 items-center justify-between border-b border-line font-display text-2xl">{t('nav.allProducts')} <ChevronRight className="h-5 w-5 text-bronze" /></Link>
          <div className="grid grid-cols-2 gap-3 py-5">
            {categories.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`} className="group">
                <div className="arch relative aspect-[4/5] overflow-hidden bg-sand">
                  <Image src={c.image} alt="" fill sizes="45vw" className="object-cover" />
                </div>
                <p className="mt-2 text-center font-display text-lg">{tr(c.name, lang)}</p>
              </Link>
            ))}
          </div>
          <p className="eyebrow mb-2 mt-2">{t('nav.occasions')}</p>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => <Link key={o} href={`/shop?occasion=${o}`} className="chip">{t(`occ.${o}`)}</Link>)}
          </div>
          <div className="mt-6 space-y-1 border-t border-line pt-4 text-[15px]">
            {[['/shop?isNew=true', t('nav.newIn')], ['/journal', t('nav.journal')], ['/about', t('nav.about')], ['/track', t('nav.track')], ['/account', t('nav.account')], ['/contact', t('nav.contact')]].map(([h, l]) => (
              <Link key={h} href={h} className="flex min-h-12 items-center">{l}</Link>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
            <span className="text-sm font-semibold">Language · ভাষা</span>
            <LangToggle />
          </div>
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-sand px-4 py-3">
            <span className="text-sm font-semibold">{t('common.theme.label')}</span>
            <ThemeToggle segmented />
          </div>
        </nav>
      </Sheet>

      <SearchOverlay open={search} onOpenChange={setSearch} />
    </>
  );
}

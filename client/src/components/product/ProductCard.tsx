import NextImage from 'next/image';
import { FadeImage as Image } from '../ui/FadeImage';
import Link from 'next/link';
import { dictionaries } from '@/i18n/dictionaries';
import { cn, discountPct, tr } from '@/lib/format';
import type { Lang, Product } from '@/lib/types';
import { Price, Stars } from '../ui/Price';
import { WishButton } from './WishButton';

/** Hook-free so it renders in both Server and Client Components. Arch-topped frame = Ruposhi signature. */
export function ProductCard({ p, lang, priority = false, className }: { p: Product; lang: Lang; priority?: boolean; className?: string }) {
  const d = dictionaries[lang].common;
  const pct = discountPct(p.price, p.compareAtPrice);
  const badge = !p.inStock ? d.soldOut : p.preOrder ? d.preOrder : pct ? `−${pct}%` : p.isNewArrival ? d.new : p.badges.includes('bestseller') ? d.bestseller : p.badges.includes('limited') ? d.limited : null;
  const name = tr(p.name, lang);
  return (
    <article className={cn('group relative', className)}>
      <Link href={`/product/${p.slug}`} className="block" aria-label={name}>
        <div className="arch-soft relative aspect-[3/4] overflow-hidden media">
          <Image
            src={p.images[0]?.url}
            alt={tr(p.images[0]?.alt, lang) || name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
            quality={75}
            className={cn('object-cover transition duration-[900ms] ease-[var(--ease-silk)] group-hover:scale-[1.04]', p.images[1] && 'sm:group-hover:opacity-0')}
          />
          {p.images[1] && (
            <NextImage src={p.images[1].url} alt="" fill sizes="(max-width: 1024px) 32vw, 24vw" quality={70} className="hidden object-cover opacity-0 transition duration-700 sm:block sm:group-hover:opacity-100" aria-hidden="true" />
          )}
          {badge && (
            <span className={cn('absolute left-2.5 top-[18%] rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-wide sm:left-3', !p.inStock ? 'bg-surface/90 text-mocha' : pct ? 'bg-maroon text-ivory dark:text-night' : 'bg-cream/95 text-espresso')}>
              {badge}
            </span>
          )}
          {p.flashSale && p.inStock && <span className="absolute inset-x-0 bottom-0 bg-night/85 py-1.5 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold">Flash · −{p.flashSale.percent}%</span>}
        </div>
      </Link>
      <WishButton productId={p._id} className="absolute right-2 top-[16%] sm:right-3" name={name} />
      <div className="mt-3 space-y-1 px-0.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-bronze">{p.fabric}</p>
        <h3 className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-medium leading-snug sm:text-[15px]">
          <Link href={`/product/${p.slug}`} className="hover:text-bronze">{name}</Link>
        </h3>
        <Price price={p.price} compare={p.compareAtPrice} lang={lang} size="sm" />
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {p.reviewCount > 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-mocha"><Stars value={p.rating} size={11} />({p.reviewCount})</span>
          ) : <span />}
          <span className="flex -space-x-1" role="img" aria-label={p.colors.map((c) => tr(c.name, lang)).join(', ')}>
            {p.colors.slice(0, 4).map((c) => <span key={c.hex} className="h-3.5 w-3.5 rounded-full border-2 border-cream" style={{ background: c.hex }} />)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, lang, priorityCount = 0, cols3 = false }: { products: Product[]; lang: Lang; priorityCount?: number; cols3?: boolean }) {
  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 lg:gap-y-12', cols3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
      {products.map((p, i) => <ProductCard key={p._id} p={p} lang={lang} priority={i < priorityCount} />)}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton arch-soft aspect-[3/4]" />
      <div className="skeleton mt-3 h-3 w-1/3" />
      <div className="skeleton mt-2 h-4 w-4/5" />
      <div className="skeleton mt-2 h-4 w-1/3" />
    </div>
  );
}

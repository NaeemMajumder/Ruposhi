import { cn, discountPct, money } from '@/lib/format';
import type { Lang } from '@/lib/types';

export function Price({ price, compare, lang, size = 'md', className }: { price: number; compare?: number; lang: Lang; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const pct = discountPct(price, compare);
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn('font-semibold text-espresso', size === 'lg' ? 'text-2xl sm:text-[28px]' : size === 'sm' ? 'text-[13px] sm:text-sm' : 'text-[15px]')}>{money(price, lang)}</span>
      {pct > 0 && (
        <>
          <s className={cn('text-mocha', size === 'lg' ? 'text-base' : 'text-xs')} aria-label={`was ${money(compare!, lang)}`}>{money(compare!, lang)}</s>
          <span className={cn('font-semibold text-maroon', size === 'lg' ? 'text-sm' : 'text-[11px]')}>−{lang === 'bn' ? money(pct, 'bn').replace('৳', '') : pct}%</span>
        </>
      )}
    </span>
  );
}

/** Rating stars as ONE element: a star mask with a gold fill clipped to the rating (light DOM, crisp at any size). */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className={cn('stars inline-block shrink-0', className)}
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
      style={{ width: size * 5 + 8, height: size, ['--pct' as string]: `${pct}%`, ['--s' as string]: `${size}px` }}
    />
  );
}

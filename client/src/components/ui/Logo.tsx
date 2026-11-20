import { cn } from '@/lib/format';

/** Ruposhi lotus mark — 8-petal flower from the brand logo, drawn as a crisp SVG. */
export function LotusMark({ className, strokeWidth = 1.6 }: { className?: string; strokeWidth?: number }) {
  const big = 'M0 -6 C 7 -14 7 -30 0 -40 C -7 -30 -7 -14 0 -6 Z';
  const small = 'M0 -9 C 5 -15 5 -25 0 -31 C -5 -25 -5 -15 0 -9 Z';
  return (
    <svg viewBox="-44 -44 88 88" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" aria-hidden="true">
      {[0, 90, 180, 270].map((r) => <path key={r} d={big} transform={`rotate(${r})`} />)}
      {[45, 135, 225, 315].map((r) => <path key={r} d={small} transform={`rotate(${r})`} />)}
      <circle r="4.2" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-espresso', className)}>
      <LotusMark className="h-7 w-7 text-gold sm:h-8 sm:w-8" />
      {!compact && <span className="font-display text-[22px] font-semibold leading-none tracking-[0.32em] sm:text-[24px]">RUPOSHI</span>}
      <span className="sr-only">Ruposhi — রূপসী</span>
    </span>
  );
}

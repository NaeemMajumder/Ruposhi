'use client';
import { useEffect, useState } from 'react';

/** Gold lotus petals drift down once — the brand's own "confetti". Skipped for reduced motion. */
export function Petals({ count = 26 }: { count?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setOn(true);
    const id = setTimeout(() => setOn(false), 6500);
    return () => clearTimeout(id);
  }, []);
  if (!on) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[95] overflow-hidden" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37) % 100;
        const size = 10 + ((i * 7) % 14);
        const delay = (i % 9) * 0.22;
        const dur = 3.8 + ((i * 13) % 20) / 10;
        const color = ['#C9A07A', '#E8C4A0', '#8A5F38', '#6E1F2A'][i % 4];
        return (
          <svg key={i} viewBox="-10 -20 20 40" width={size} height={size * 2} className="absolute top-0"
            style={{ left: `${left}%`, animation: `petal-fall ${dur}s cubic-bezier(.3,.1,.4,1) ${delay}s both`, ['--dx' as string]: `${((i % 5) - 2) * 40}px`, ['--rot' as string]: `${(i % 2 ? 1 : -1) * (360 + i * 20)}deg` }}>
            <path d="M0 18 C 8 8 8 -8 0 -18 C -8 -8 -8 8 0 18 Z" fill={color} />
          </svg>
        );
      })}
    </div>
  );
}

/** Animated check mark that draws itself inside a lotus ring. */
export function SuccessMark() {
  return (
    <svg viewBox="0 0 80 80" className="h-20 w-20" aria-hidden="true">
      <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeDasharray="226" style={{ ['--len' as string]: 226, animation: 'draw 1s var(--ease-silk) both' }} />
      <path d="M25 41 l10 10 l21 -22" fill="none" stroke="var(--color-success)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="50" style={{ ['--len' as string]: 50, animation: 'draw .6s var(--ease-silk) .7s both' }} />
    </svg>
  );
}

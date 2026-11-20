'use client';
import { useEffect, useRef, useState } from 'react';
import { toBnDigits } from '@/lib/format';

/** Counts from 0 → value when scrolled into view (ease-out, ~1.2s). `format` renders each frame. */
export function CountUp({ value, format, lang, duration = 1200, className }: { value: number; format?: (n: number) => string; lang?: 'en' | 'bn'; duration?: number; className?: string }) {
  const fmt = format ?? ((n: number) => (lang === 'bn' ? toBnDigits(String(Math.round(n))) : String(Math.round(n))));
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(value);
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        setN(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return <span ref={ref} className={className}>{fmt(n)}</span>;
}

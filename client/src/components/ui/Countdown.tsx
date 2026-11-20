'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';
import { toBnDigits } from '@/lib/format';

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

export function Countdown({ endsAt, tone = 'dark' }: { endsAt: string; tone?: 'dark' | 'light' }) {
  const { t, lang } = useT();
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(new Date(endsAt).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  const p = parts(left ?? 0);
  const fmt = (n: number) => (lang === 'bn' ? toBnDigits(String(n).padStart(2, '0')) : String(n).padStart(2, '0'));
  const box = tone === 'dark' ? 'bg-espresso text-cream' : 'bg-surface text-espresso border border-line';
  return (
    <span className="inline-flex items-center gap-1.5" aria-live="off" suppressHydrationWarning>
      {(['d', 'h', 'm', 's'] as const).map((k) => (
        <span key={k} className={`${box} inline-flex min-w-11 flex-col items-center overflow-hidden rounded-lg px-1.5 py-1 tabular-nums`}>
          <span key={left === null ? 'x' : p[k]} className="text-base font-semibold leading-tight motion-safe:animate-flip">{left === null ? '--' : fmt(p[k])}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">{t(`home.${k}`)}</span>
        </span>
      ))}
    </span>
  );
}

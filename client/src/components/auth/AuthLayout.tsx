'use client';
import { Sparkles } from 'lucide-react';
import { useT } from '@/i18n/client';
import { LotusMark } from '../ui/Logo';

/** Split layout shared by sign-in, register and password reset (decorative panel is desktop-only). */
export function AuthLayout({ title, sub, children }: { title: string; sub?: React.ReactNode; children: React.ReactNode }) {
  const { lang } = useT();
  const perks = lang === 'bn' ? ['অর্ডার ট্র্যাক ও ইনভয়েস', 'রূপসী পয়েন্ট ও রেফারেল', 'সংরক্ষিত ঠিকানা — দ্রুত চেকআউট'] : ['Track orders & invoices', 'Ruposhi points & referrals', 'Saved addresses — faster checkout'];
  return (
    <div className="container-x grid min-h-[75vh] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="grain relative hidden h-full min-h-[560px] overflow-hidden rounded-[40px] bg-night text-ivory lg:flex lg:flex-col lg:justify-end lg:p-12">
        <LotusMark className="absolute -right-16 -top-16 h-80 w-80 animate-spin-slow text-gold/20" strokeWidth={0.7} />
        <p className="eyebrow !text-gold">Ruposhi circle</p>
        <p className="h-display mt-4 text-6xl">{lang === 'bn' ? 'আপনার রূপসী, এক জায়গায়।' : 'Your Ruposhi, all in one place.'}</p>
        <ul className="mt-6 space-y-2 text-ivory/75">
          {perks.map((x, k) => (
            <li key={x} className="flex items-center gap-2" style={{ animation: `rise .6s var(--ease-silk) ${300 + k * 120}ms both` }}><Sparkles className="h-4 w-4 text-gold" /> {x}</li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md">
        <div className="stagger">
          <h1 className="h-display text-[44px] leading-[1.05] sm:text-5xl">{title}</h1>
          {sub && <p className="mt-3 text-mocha">{sub}</p>}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

/** Where to go after signing in — only same-site paths (no open redirects). */
export const safeNext = (raw: string | null, fallback = '/account') => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback);

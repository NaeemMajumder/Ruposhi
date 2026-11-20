'use client';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useT } from '@/i18n/client';
import { cn } from '@/lib/format';

type Pref = 'light' | 'dark' | 'system';
const ORDER: Pref[] = ['light', 'dark', 'system'];
const ICON = { light: Sun, dark: Moon, system: Monitor };

function readPref(): Pref {
  const c = document.cookie.match(/(?:^|; )theme=(light|dark)/)?.[1];
  return (c as Pref) ?? 'system';
}

export function applyTheme(pref: Pref) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (pref !== 'system') root.classList.add(pref);
  document.cookie = pref === 'system' ? 'theme=; path=/; max-age=0; samesite=lax' : `theme=${pref}; path=/; max-age=31536000; samesite=lax`;
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', dark ? '#15100C' : '#FFF9F5');
  window.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
}

/** true when the page is currently rendered dark (forced or via OS). */
export function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const calc = () => {
      const r = document.documentElement.classList;
      setDark(r.contains('dark') || (!r.contains('light') && mq.matches));
    };
    calc();
    mq.addEventListener('change', calc);
    window.addEventListener('themechange', calc);
    return () => {
      mq.removeEventListener('change', calc);
      window.removeEventListener('themechange', calc);
    };
  }, []);
  return dark;
}

/** Icon button (cycles light → dark → system). `segmented` shows all three for menus/settings. */
export function ThemeToggle({ className, segmented = false }: { className?: string; segmented?: boolean }) {
  const { t } = useT();
  const [pref, setPref] = useState<Pref>('system');
  useEffect(() => setPref(readPref()), []);
  const set = (p: Pref) => {
    setPref(p);
    applyTheme(p);
  };
  const label = (p: Pref) => t(`common.theme.${p}`);

  if (segmented)
    return (
      <div className={cn('inline-flex rounded-full border border-line bg-surface p-0.5', className)} role="radiogroup" aria-label={t('common.theme.label')}>
        {ORDER.map((p) => {
          const I = ICON[p];
          return (
            <button key={p} role="radio" aria-checked={pref === p} onClick={() => set(p)} title={label(p)} className={cn('grid min-h-8 min-w-10 place-items-center rounded-full px-2.5 transition', pref === p ? 'bg-espresso text-cream' : 'text-mocha hover:text-espresso')}>
              <I className="h-4 w-4" />
              <span className="sr-only">{label(p)}</span>
            </button>
          );
        })}
      </div>
    );

  const I = ICON[pref];
  const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
  return (
    <button onClick={() => set(next)} className={cn('grid h-11 w-11 place-items-center rounded-full transition hover:bg-sand', className)} aria-label={`${t('common.theme.label')}: ${label(pref)} → ${label(next)}`} title={label(pref)}>
      <I className="h-[19px] w-[19px]" />
    </button>
  );
}

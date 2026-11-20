'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Thin gold progress bar on top while a route is loading (internal link clicks). */
export function NavProgress() {
  const path = usePathname();
  const sp = useSearchParams();
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setState('loading');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === 'loading' ? 'done' : s));
    const id = setTimeout(() => setState('idle'), 400);
    return () => clearTimeout(id);
  }, [path, sp]);

  if (state === 'idle') return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]" aria-hidden="true">
      <div
        className="h-full origin-left bg-gradient-to-r from-gold via-bronze to-gold shadow-[0_0_10px_var(--color-gold)]"
        style={state === 'loading' ? { animation: 'navbar 8s var(--ease-silk) forwards' } : { transform: 'scaleX(1)', opacity: 0, transition: 'transform .2s, opacity .35s .15s' }}
      />
    </div>
  );
}

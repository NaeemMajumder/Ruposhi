'use client';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch } from '@/lib/client-api';
import { cn } from '@/lib/format';
import { track } from '@/lib/track';

export function NewsletterForm({ tone = 'light', source }: { tone?: 'light' | 'dark'; source: 'footer' | 'popup' }) {
  const { t } = useT();
  const [v, setV] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setState('busy');
    try {
      await apiFetch('/newsletter', { body: { contact: v, source } });
      track('lead');
      setState('done');
    } catch (ex) {
      setErr((ex as Error).message);
      setState('idle');
    }
  };
  if (state === 'done')
    return <p className={cn('mt-4 flex items-center gap-2 text-sm font-medium', tone === 'dark' ? 'text-gold' : 'text-success')}><Check className="h-4 w-4" />{t('home.subscribed')}</p>;
  return (
    <form onSubmit={submit} className="mt-4" noValidate>
      <label htmlFor={`nl-${source}`} className="sr-only">{t('home.emailOrPhone')}</label>
      <div className={cn('flex items-center rounded-full border p-1 pl-4', tone === 'dark' ? 'border-ivory/20 bg-ivory/5' : 'border-line bg-surface')}>
        <input
          id={`nl-${source}`}
          value={v}
          onChange={(e) => setV(e.target.value)}
          required
          maxLength={120}
          placeholder={t('home.emailOrPhone')}
          className={cn('h-10 min-w-0 flex-1 bg-transparent text-sm focus:outline-none', tone === 'dark' ? 'text-ivory placeholder:text-ivory/45' : 'placeholder:text-mocha/60')}
        />
        <button disabled={state === 'busy' || !v.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-night transition hover:bg-gold-soft disabled:opacity-50" aria-label={t('home.subscribe')}>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-[#f2a7a7]" role="alert">{err}</p>}
    </form>
  );
}

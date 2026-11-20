'use client';
import { useRef, useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { shake } from '@/lib/motion';
import { track } from '@/lib/track';

export function ContactForm() {
  const { t, lang } = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  const ref = useRef<HTMLFormElement>(null);
  if (state === 'done')
    return (
      <div className="card flex animate-scale-in flex-col items-center justify-center p-10 text-center">
        <span className="grid h-16 w-16 animate-pop place-items-center rounded-full bg-success/15 text-success"><Check className="h-8 w-8" /></span>
        <p className="mt-5 font-display text-3xl">{lang === 'bn' ? 'বার্তা পেয়েছি!' : 'Message received!'}</p>
        <p className="mt-2 text-mocha">{lang === 'bn' ? 'আমরা শীঘ্রই যোগাযোগ করব।' : 'We will get back to you shortly.'}</p>
      </div>
    );
  return (
    <form
      ref={ref}
      className="card space-y-4 p-6 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(e.currentTarget).entries());
        setState('busy');
        setErr('');
        try {
          await apiFetch('/contact', { body });
          track('lead');
          setState('done');
        } catch (e2) {
          setState('idle');
          setErr(e2 instanceof ApiError ? e2.message : t('errors.generic'));
          shake(ref.current);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="ct-name">{t('checkout.name')}</label><input id="ct-name" name="name" required maxLength={80} autoComplete="name" className="field" /></div>
        <div><label className="label" htmlFor="ct-phone">{t('checkout.phone')}</label><input id="ct-phone" name="phone" required type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className="field" /></div>
      </div>
      <div><label className="label" htmlFor="ct-email">{t('checkout.email')}</label><input id="ct-email" name="email" type="email" maxLength={120} className="field" /></div>
      <div><label className="label" htmlFor="ct-subject">{lang === 'bn' ? 'বিষয়' : 'Subject'}</label><input id="ct-subject" name="subject" required maxLength={120} className="field" /></div>
      <div><label className="label" htmlFor="ct-msg">{lang === 'bn' ? 'বার্তা' : 'Message'}</label><textarea id="ct-msg" name="message" required minLength={10} maxLength={2000} rows={5} className="field" /></div>
      {err && <p className="animate-fade text-sm text-danger" role="alert">{err}</p>}
      <button disabled={state === 'busy'} className="btn-primary h-12 w-full">{state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {t('common.submit')}</button>
    </form>
  );
}

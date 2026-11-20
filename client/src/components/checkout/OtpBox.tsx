'use client';
import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Loader2, MessageSquareText } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, toBnDigits } from '@/lib/format';
import { shake } from '@/lib/motion';

export const normalizePhone = (raw: string) => {
  const d = raw.replace(/[^\d]/g, '').replace(/^880/, '0').replace(/^88(?=01)/, '');
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
};

type Verified = { verified: true; token: string };

/**
 * Phone OTP: send → 6 single-digit boxes (auto-advance, paste, backspace) → verify.
 * The server hashes codes, limits attempts and returns a signed token the order API checks.
 */
export function OtpBox({ phone, purpose, onVerified, autoSend = false }: { phone: string; purpose: 'checkout' | 'register' | 'track'; onVerified: (r: Verified) => void; autoSend?: boolean }) {
  const { t, lang } = useT();
  const [stage, setStage] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'done'>('idle');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [cool, setCool] = useState(0);
  const [demo, setDemo] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const valid = normalizePhone(phone);

  useEffect(() => {
    if (!cool) return;
    const id = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cool]);

  // phone changed after verifying → must verify again
  useEffect(() => {
    setStage('idle');
    setDigits(['', '', '', '', '', '']);
    setDemo(null);
    setErr('');
  }, [valid]);

  const send = async () => {
    if (!valid) return;
    setStage('sending');
    setErr('');
    try {
      const r = await apiFetch<{ resendInSec: number; demoCode?: string }>('/otp/send', { body: { phone: valid, purpose } });
      setStage('sent');
      setCool(r.resendInSec);
      setDemo(r.demoCode ?? null);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (e) {
      setStage('idle');
      setErr(e instanceof ApiError ? e.message : t('errors.generic'));
    }
  };

  useEffect(() => {
    if (autoSend && valid && stage === 'idle') send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSend, valid]);

  const verify = async (code: string) => {
    setStage('verifying');
    setErr('');
    try {
      const r = await apiFetch<Verified>('/otp/verify', { body: { phone: valid, purpose, code } });
      setStage('done');
      onVerified(r);
    } catch (e) {
      setStage('sent');
      setErr(e instanceof ApiError ? e.message : t('errors.generic'));
      shake(wrap.current);
      setDigits(['', '', '', '', '', '']);
      boxes.current[0]?.focus();
    }
  };

  const setAt = (k: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      // paste / SMS autofill
      const arr = clean.slice(0, 6).split('');
      const next = [...digits];
      arr.forEach((d, j) => (next[j] = d));
      setDigits(next);
      boxes.current[Math.min(5, arr.length)]?.focus();
      if (next.every(Boolean)) verify(next.join(''));
      return;
    }
    const next = [...digits];
    next[k] = clean;
    setDigits(next);
    if (clean && k < 5) boxes.current[k + 1]?.focus();
    if (next.every(Boolean)) verify(next.join(''));
  };

  if (stage === 'done')
    return (
      <p className="flex animate-scale-in items-center gap-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">
        <BadgeCheck className="h-5 w-5 animate-pop" /> {t('checkout.verified')}
      </p>
    );

  return (
    <div className="rounded-2xl border border-line bg-blush p-4">
      {stage === 'idle' || stage === 'sending' ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-bronze" /> {t('checkout.verifyPhone')}</p>
          <button type="button" onClick={send} disabled={!valid || stage === 'sending'} className="btn-primary !min-h-10">
            {stage === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t('checkout.sendCode')}
          </button>
        </div>
      ) : (
        <div className="animate-fade">
          <p className="text-sm">{t('checkout.codeSent', { phone: lang === 'bn' ? toBnDigits(valid ?? '') : (valid ?? '') })}</p>
          {demo && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gold/20 px-3 py-1.5 text-xs">
              {t('checkout.demoCode')} <button type="button" onClick={() => setAt(0, demo)} className="font-mono text-sm font-bold tracking-[0.3em] underline decoration-dotted">{demo}</button>
            </p>
          )}
          <div ref={wrap} className="mt-4 flex justify-between gap-2 sm:justify-start" role="group" aria-label={t('checkout.enterCode')}>
            {digits.map((d, k) => (
              <input
                key={k}
                ref={(el) => {
                  boxes.current[k] = el;
                }}
                value={d}
                onChange={(e) => setAt(k, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !d && k > 0) boxes.current[k - 1]?.focus();
                }}
                inputMode="numeric"
                autoComplete={k === 0 ? 'one-time-code' : 'off'}
                maxLength={k === 0 ? 6 : 1}
                aria-label={`Digit ${k + 1}`}
                disabled={stage === 'verifying'}
                className={cn(
                  'h-13 w-full max-w-12 rounded-xl border bg-surface text-center font-mono text-xl font-semibold transition-all duration-200 focus:-translate-y-0.5 focus:border-bronze focus:outline-none focus:ring-4 focus:ring-gold/20',
                  d ? 'border-espresso' : 'border-line',
                  err && 'border-danger',
                )}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            {err ? <p className="animate-fade font-medium text-danger" role="alert">{err}</p> : <span className="text-mocha">{stage === 'verifying' ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null}</span>}
            {cool > 0 ? (
              <span className="tabular-nums text-mocha">{t('checkout.resend', { s: lang === 'bn' ? toBnDigits(String(cool)) : cool })}</span>
            ) : (
              <button type="button" onClick={send} className="font-semibold text-bronze underline-offset-2 hover:underline">{t('checkout.resendNow')}</button>
            )}
          </div>
        </div>
      )}
      {err && stage === 'idle' && <p className="mt-2 text-xs text-danger" role="alert">{err}</p>}
    </div>
  );
}

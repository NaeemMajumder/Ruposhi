'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, MessageSquareText } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { toBnDigits } from '@/lib/format';
import { shake } from '@/lib/motion';
import { useAuth, type User } from '@/store/auth';
import { AuthLayout } from '../auth/AuthLayout';
import { CodeField, PasswordField, Strength, TextField, passwordIssues } from '../auth/Fields';
import { normalizePhone } from '../checkout/OtpBox';
import { toast } from '../ui/Toast';

/** Forgot password: registered phone → SMS code → new password (all other sessions are signed out). */
export function ForgotView() {
  const { t, lang } = useT();
  const L = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const setUser = useAuth((s) => s.setUser);
  const [phoneRaw, setPhoneRaw] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [demo, setDemo] = useState<string | null>(null);
  const [cool, setCool] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ phone?: string; code?: string; pw?: string; confirm?: string; form?: string }>({});
  const box = useRef<HTMLDivElement>(null);
  const phone = normalizePhone(phoneRaw);

  useEffect(() => {
    if (!cool) return;
    const id = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cool]);

  const send = async () => {
    if (!phone) return setErr({ phone: L('Enter a valid number: 01XXXXXXXXX', 'সঠিক নম্বর দিন: 01XXXXXXXXX') });
    setBusy(true);
    setErr({});
    try {
      const r = await apiFetch<{ resendInSec: number; demoCode?: string }>('/auth/password/forgot', { body: { phone } });
      setDemo(r.demoCode ?? null);
      setCool(r.resendInSec);
      setStep(2);
    } catch (e) {
      setErr({ form: e instanceof ApiError ? e.message : t('errors.generic') });
      shake(box.current);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const e: typeof err = {};
    if (code.length !== 6) e.code = L('Enter the 6-digit code.', '৬ সংখ্যার কোড দিন।');
    const issues = passwordIssues(pw, lang);
    if (issues.length) e.pw = issues.join(' · ');
    if (confirm !== pw) e.confirm = L('Passwords do not match.', 'পাসওয়ার্ড মিলছে না।');
    setErr(e);
    if (Object.keys(e).length) return shake(box.current);
    setBusy(true);
    try {
      const r = await apiFetch<{ user: User }>('/auth/password/reset', { body: { phone, code, password: pw } });
      setUser(r.user);
      toast.success(L('Password updated — you are signed in.', 'পাসওয়ার্ড বদলানো হয়েছে — আপনি সাইন ইন অবস্থায় আছেন।'));
      window.location.replace('/account');
    } catch (ex) {
      setErr({ form: ex instanceof ApiError ? ex.message : t('errors.generic') });
      shake(box.current);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={L('Reset your password', 'পাসওয়ার্ড রিসেট করুন')}
      sub={step === 1 ? L('Enter the phone number on your account. We will text you a code.', 'অ্যাকাউন্টের ফোন নম্বর দিন। আমরা একটি কোড পাঠাব।') : L(`If ${phone} has an account, a code is on its way.`, `${toBnDigits(phone ?? '')} নম্বরে অ্যাকাউন্ট থাকলে কোড পাঠানো হয়েছে।`)}
    >
      <div ref={box}>
        {step === 1 ? (
          <form noValidate className="animate-fade space-y-4" onSubmit={(e) => (e.preventDefault(), send())}>
            <TextField label={L('Mobile number', 'মোবাইল নম্বর')} type="tel" inputMode="tel" autoComplete="tel" value={phoneRaw} onChange={(e) => (setPhoneRaw(e.target.value), setErr({}))} error={err.phone} placeholder="01XXXXXXXXX" maxLength={16} autoFocus />
            {err.form && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{err.form}</p>}
            <button disabled={busy} className="btn-primary h-13 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />} {t('checkout.sendCode')}</button>
          </form>
        ) : (
          <form noValidate className="animate-scale-in space-y-4" onSubmit={(e) => (e.preventDefault(), reset())}>
            {demo && (
              <p className="inline-flex items-center gap-2 rounded-lg bg-gold/20 px-3 py-1.5 text-xs">
                {t('checkout.demoCode')} <button type="button" onClick={() => setCode(demo)} className="font-mono text-sm font-bold tracking-[0.3em] underline decoration-dotted">{demo}</button>
              </p>
            )}
            <CodeField label={t('checkout.enterCode')} value={code} onChange={(v) => (setCode(v), setErr((x) => ({ ...x, code: undefined })))} error={err.code} />
            <PasswordField label={L('New password', 'নতুন পাসওয়ার্ড')} value={pw} onChange={(e) => (setPw(e.target.value), setErr((x) => ({ ...x, pw: undefined })))} error={err.pw} autoComplete="new-password" maxLength={72} hint={<Strength value={pw} lang={lang} />} />
            <PasswordField label={L('Confirm new password', 'নতুন পাসওয়ার্ড আবার')} value={confirm} onChange={(e) => (setConfirm(e.target.value), setErr((x) => ({ ...x, confirm: undefined })))} error={err.confirm} autoComplete="new-password" maxLength={72} />
            {err.form && <p role="alert" className="animate-fade rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{err.form}</p>}
            <button disabled={busy} className="btn-primary h-13 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {L('Update password', 'পাসওয়ার্ড আপডেট করুন')} {!busy && <ArrowRight className="h-4 w-4" />}</button>
            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={() => setStep(1)} className="btn-link inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> {L('Change number', 'নম্বর বদলান')}</button>
              {cool > 0 ? <span className="tabular-nums text-xs text-mocha">{t('checkout.resend', { s: lang === 'bn' ? toBnDigits(String(cool)) : cool })}</span> : <button type="button" onClick={send} className="font-semibold text-bronze hover:underline">{t('checkout.resendNow')}</button>}
            </div>
          </form>
        )}
      </div>
      <p className="mt-8 text-center text-sm text-mocha">
        {L('Remembered it?', 'মনে পড়েছে?')} <Link href="/login" className="btn-link font-semibold">{t('account.signIn')}</Link>
      </p>
    </AuthLayout>
  );
}

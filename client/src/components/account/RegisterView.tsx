'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, toBnDigits } from '@/lib/format';
import { shake } from '@/lib/motion';
import { track } from '@/lib/track';
import { useAuth, type User } from '@/store/auth';
import { AuthLayout, safeNext } from '../auth/AuthLayout';
import { PasswordField, Strength, TextField, passwordIssues } from '../auth/Fields';
import { normalizePhone, OtpBox } from '../checkout/OtpBox';
import { toast } from '../ui/Toast';

type F = { name: string; email: string; phone: string; password: string; confirm: string; agree: boolean };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Registration: name, email, phone, password → verify the phone by OTP (demo code 222222) → account created
 * and signed in. Guests who ordered before with the same phone keep their order history.
 */
export function RegisterView() {
  const { t, lang } = useT();
  const L = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const next = safeNext(useSearchParams().get('next'));
  const setUser = useAuth((s) => s.setUser);
  const [f, setF] = useState<F>({ name: '', email: '', phone: '', password: '', confirm: '', agree: true });
  const [errors, setErrors] = useState<Partial<Record<keyof F | 'form', string>>>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const phone = normalizePhone(f.phone);
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    setErrors((x) => ({ ...x, [k]: undefined, form: undefined }));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (f.name.trim().length < 2) e.name = L('Please enter your name.', 'আপনার নাম লিখুন।');
    if (!EMAIL.test(f.email.trim())) e.email = L('Enter a valid email address.', 'সঠিক ইমেইল দিন।');
    if (!phone) e.phone = L('Enter a valid number: 01XXXXXXXXX', 'সঠিক নম্বর দিন: 01XXXXXXXXX');
    const pw = passwordIssues(f.password, lang);
    if (pw.length) e.password = pw.join(' · ');
    if (f.confirm !== f.password) e.confirm = L('Passwords do not match.', 'পাসওয়ার্ড মিলছে না।');
    if (!f.agree) e.agree = L('Please accept the terms.', 'শর্তাবলিতে সম্মতি দিন।');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const toStep2 = async () => {
    if (!validate()) return shake(form.current);
    setBusy(true);
    try {
      const r = await apiFetch<{ emailTaken: boolean; phoneTaken: boolean }>('/auth/register/check', { body: { email: f.email.trim(), phone } });
      if (r.emailTaken || r.phoneTaken) {
        setErrors({
          ...(r.emailTaken ? { email: L('This email is already registered — sign in instead.', 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে — সাইন ইন করুন।') } : {}),
          ...(r.phoneTaken ? { phone: L('This number already has an account — sign in or reset your password.', 'এই নম্বরে আগেই অ্যাকাউন্ট আছে — সাইন ইন বা পাসওয়ার্ড রিসেট করুন।') } : {}),
        });
        return shake(form.current);
      }
      setStep(2);
    } catch (e) {
      setErrors({ form: e instanceof ApiError ? e.message : t('errors.generic') });
    } finally {
      setBusy(false);
    }
  };

  const create = async (otpToken: string) => {
    setBusy(true);
    try {
      const r = await apiFetch<{ user: User }>('/auth/register', { body: { name: f.name.trim(), email: f.email.trim(), phone, password: f.password, otpToken } });
      setUser(r.user);
      track('complete_registration');
      toast.success(L(`Welcome to Ruposhi, ${r.user.name.split(' ')[0]}!`, `রূপসীতে স্বাগতম, ${r.user.name.split(' ')[0]}!`));
      // full navigation: drops any page the router cached while signed out
      window.location.replace(next);
    } catch (e) {
      setStep(1);
      setErrors({ form: e instanceof ApiError ? e.message : t('errors.generic') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? L('Create your account', 'অ্যাকাউন্ট খুলুন') : L('Verify your phone', 'ফোন নম্বর যাচাই করুন')}
      sub={step === 1 ? L('Faster checkout, order history and Ruposhi points.', 'দ্রুত চেকআউট, অর্ডারের ইতিহাস আর রূপসী পয়েন্ট।') : L('One last step — enter the 6-digit code we sent.', 'শেষ ধাপ — পাঠানো ৬ সংখ্যার কোডটি দিন।')}
    >
      <ol className="mb-6 flex items-center gap-3 text-xs font-semibold" aria-label="Steps">
        {[L('Your details', 'আপনার তথ্য'), L('Verify phone', 'ফোন যাচাই')].map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2', step >= i + 1 ? 'text-espresso' : 'text-mocha')}>
            <span className={cn('grid h-6 w-6 place-items-center rounded-full border text-[11px] transition-all duration-500', step > i + 1 ? 'border-success bg-success text-ivory' : step === i + 1 ? 'border-espresso bg-espresso text-cream' : 'border-line')}>
              {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : lang === 'bn' ? toBnDigits(String(i + 1)) : i + 1}
            </span>
            {s}
            {i === 0 && <span className="h-px w-8 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <form ref={form} noValidate className="animate-fade space-y-4" onSubmit={(e) => (e.preventDefault(), toStep2())}>
          <TextField label={L('Full name', 'পূর্ণ নাম')} value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" maxLength={80} autoFocus />
          <TextField label={L('Email', 'ইমেইল')} type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" inputMode="email" maxLength={120} placeholder="you@example.com" />
          <TextField label={L('Mobile number', 'মোবাইল নম্বর')} type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" inputMode="tel" maxLength={16} placeholder="01XXXXXXXXX" />
          <PasswordField
            label={L('Password', 'পাসওয়ার্ড')}
            value={f.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
            maxLength={72}
            hint={<><Strength value={f.password} lang={lang} /><p className="mt-1 text-[11px] text-mocha">{L('8+ characters with a letter and a number.', '৮+ অক্ষর, অন্তত একটি অক্ষর ও একটি সংখ্যা।')}</p></>}
          />
          <PasswordField label={L('Confirm password', 'পাসওয়ার্ড আবার লিখুন')} value={f.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" maxLength={72} />
          <label className="flex items-start gap-3 text-sm text-mocha">
            <input type="checkbox" checked={f.agree} onChange={set('agree')} className="mt-0.5 h-4 w-4 accent-[var(--color-espresso)]" />
            <span>{L('I agree to the', 'আমি সম্মত')} <Link href="/policies/terms" className="btn-link">{L('Terms', 'শর্তাবলি')}</Link> {L('and', 'ও')} <Link href="/policies/privacy" className="btn-link">{L('Privacy policy', 'গোপনীয়তা নীতি')}</Link>{lang === 'bn' ? '-তে' : '.'}</span>
          </label>
          {errors.agree && <p role="alert" className="text-xs font-medium text-danger">{errors.agree}</p>}
          {errors.form && <p role="alert" className="animate-fade rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{errors.form}</p>}
          <button disabled={busy} className="btn-primary h-13 w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t('common.continue')} {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      ) : (
        <div className="animate-scale-in space-y-4">
          <OtpBox phone={phone!} purpose="register" autoSend onVerified={(r) => create(r.token)} />
          {busy && <p className="flex items-center gap-2 text-sm text-mocha"><Loader2 className="h-4 w-4 animate-spin" /> {L('Creating your account…', 'অ্যাকাউন্ট তৈরি হচ্ছে…')}</p>}
          <button type="button" onClick={() => setStep(1)} disabled={busy} className="btn-link inline-flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" /> {L('Change details', 'তথ্য পরিবর্তন')}</button>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-mocha">
        {L('Already have an account?', 'আগে থেকেই অ্যাকাউন্ট আছে?')} <Link href={`/login${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className="btn-link font-semibold">{t('account.signIn')}</Link>
      </p>
    </AuthLayout>
  );
}

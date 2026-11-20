'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { shake } from '@/lib/motion';
import { useAuth, useUser, type User } from '@/store/auth';
import { AuthLayout, safeNext } from '../auth/AuthLayout';
import { PasswordField, TextField } from '../auth/Fields';
import { toast } from '../ui/Toast';

export const DEMO_CUSTOMER = { identifier: 'nusrat@ruposhi.demo', phone: '01711000000', password: 'Demo@1234' };

/** Sign in with email OR phone + password (Passport `customer-local` on the API). */
export function LoginView() {
  const { t, lang } = useT();
  const L = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const sp = useSearchParams();
  const next = safeNext(sp.get('next'));
  const setUser = useAuth((s) => s.setUser);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const { user, ready } = useUser();
  // already signed in → straight to where they were going
  useEffect(() => {
    if (ready && user) window.location.replace(next);
  }, [ready, user, next]);

  const submit = async (id = identifier, pw = password) => {
    if (!id.trim() || !pw) return setErr(L('Enter your email/phone and password.', 'ইমেইল/ফোন ও পাসওয়ার্ড দিন।'));
    setBusy(true);
    setErr('');
    try {
      const r = await apiFetch<{ user: User }>('/auth/login', { body: { identifier: id.trim(), password: pw } });
      setUser(r.user);
      toast.success(t('account.hello', { name: r.user.name.split(' ')[0] }));
      // full navigation: drops any page the router cached while signed out
      window.location.replace(next);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('errors.generic'));
      shake(form.current);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={L('Welcome back', 'আবার স্বাগতম')} sub={L('Sign in with your email or phone number.', 'ইমেইল অথবা ফোন নম্বর দিয়ে সাইন ইন করুন।')}>
      <form ref={form} noValidate className="space-y-4" onSubmit={(e) => (e.preventDefault(), submit())}>
        <TextField
          label={L('Email or phone number', 'ইমেইল অথবা ফোন নম্বর')}
          value={identifier}
          onChange={(e) => (setIdentifier(e.target.value), setErr(''))}
          autoComplete="username"
          inputMode="email"
          placeholder="you@example.com / 01XXXXXXXXX"
          maxLength={120}
          autoFocus
        />
        <div>
          <PasswordField label={L('Password', 'পাসওয়ার্ড')} value={password} onChange={(e) => (setPassword(e.target.value), setErr(''))} autoComplete="current-password" maxLength={200} />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="btn-link text-sm">{L('Forgot password?', 'পাসওয়ার্ড ভুলে গেছেন?')}</Link>
          </div>
        </div>
        {err && <p role="alert" className="animate-fade rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{err}</p>}
        {/* staff accounts live on a separate sign-in page — point them there instead of a dead end */}
        {err && /@ruposhi\.com\.bd\s*$/i.test(identifier) && (
          <p className="animate-fade rounded-xl bg-gold/15 px-4 py-3 text-sm">
            {L('This looks like a staff email. Staff sign in here:', 'এটা স্টাফের ইমেইল মনে হচ্ছে। স্টাফরা এখানে সাইন ইন করেন:')}{' '}
            <a href="/admin/login" className="btn-link font-semibold">{L('Staff sign in →', 'স্টাফ সাইন ইন →')}</a>
          </p>
        )}
        <button disabled={busy} className="btn-primary h-13 w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t('account.signIn')} {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mocha">
        {L('New to Ruposhi?', 'রূপসীতে নতুন?')} <Link href={`/register${next !== '/account' ? `?next=${encodeURIComponent(next)}` : ''}`} className="btn-link font-semibold">{L('Create an account', 'অ্যাকাউন্ট খুলুন')}</Link>
      </p>

      <div className="my-8 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-mocha"><span className="h-px flex-1 bg-line" />{t('common.or')}<span className="h-px flex-1 bg-line" /></div>
      <button
        type="button"
        disabled={busy}
        onClick={() => (setIdentifier(DEMO_CUSTOMER.identifier), setPassword(DEMO_CUSTOMER.password), submit(DEMO_CUSTOMER.identifier, DEMO_CUSTOMER.password))}
        className="btn-ghost h-12 w-full"
      >
        <Sparkles className="h-4 w-4 text-bronze" /> {L('Explore with the demo account', 'ডেমো অ্যাকাউন্ট দিয়ে দেখুন')}
      </button>
      <p className="mt-4 rounded-xl bg-sand p-3 text-center text-xs text-mocha">
        {L('Demo', 'ডেমো')}: <span className="font-mono">{DEMO_CUSTOMER.identifier}</span> / <span className="font-mono">{DEMO_CUSTOMER.phone}</span> · <span className="font-mono">{DEMO_CUSTOMER.password}</span>
      </p>
      <p className="mt-6 text-center text-sm text-mocha">{t('checkout.guestNote')} <Link href="/track" className="btn-link">{t('nav.track')}</Link></p>
    </AuthLayout>
  );
}

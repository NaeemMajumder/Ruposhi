'use client';
import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { ArrowRight, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { shake } from '@/lib/motion';
import { useStaffAuth, type StaffUser } from '@/store/auth';
import { ThemeToggle } from '@/theme/ThemeToggle';
import { LangToggle } from '../layout/Header';
import { Logo, LotusMark } from '../ui/Logo';
import { PasswordField, TextField } from '../auth/Fields';
import { useL } from './lib';

/** Demo staff accounts (seeded in DEMO_MODE only — production uses real accounts created by the owner). */
const DEMO = [
  { email: 'owner@ruposhi.com.bd', password: 'Owner@1234', en: 'Owner', bn: 'মালিক' },
  { email: 'rafiq@ruposhi.com.bd', password: 'Manager@1234', en: 'Manager', bn: 'ম্যানেজার' },
  { email: 'shila@ruposhi.com.bd', password: 'Orders@1234', en: 'Order staff', bn: 'অর্ডার স্টাফ' },
  { email: 'mitu@ruposhi.com.bd', password: 'Content@1234', en: 'Content editor', bn: 'কনটেন্ট এডিটর' },
];

export function StaffLogin() {
  const L = useL();
  const raw = useSearchParams().get('next');
  const next = raw && raw.startsWith('/admin') && !raw.startsWith('/admin/login') ? raw : '/admin';
  const setStaff = useStaffAuth((s) => s.setStaff);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const form = useRef<HTMLFormElement>(null);

  const submit = async (e = email, p = password) => {
    if (!e.trim() || !p) return setErr(L('Enter your email and password.', 'ইমেইল ও পাসওয়ার্ড দিন।'));
    setBusy(true);
    setErr('');
    try {
      const r = await apiFetch<{ user: StaffUser }>('/admin/auth/login', { body: { email: e.trim(), password: p } });
      setStaff(r.user);
      window.location.replace(next);
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : L('Something went wrong.', 'কিছু একটা ভুল হয়েছে।'));
      shake(form.current);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="grain relative hidden overflow-hidden bg-night p-12 text-ivory lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <LotusMark className="absolute -bottom-24 -right-24 h-[28rem] w-[28rem] animate-spin-slow text-gold/15" strokeWidth={0.6} />
        <div>
          <p className="eyebrow !text-gold">Ruposhi · Admin</p>
          <p className="h-display mt-4 max-w-md text-6xl">{L('Run the store with care.', 'যত্ন নিয়ে স্টোর চালান।')}</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-ivory/70"><ShieldCheck className="h-4 w-4 text-gold" /> {L('Every action is checked against your role and written to the audit log.', 'প্রতিটি কাজ আপনার রোল অনুযায়ী যাচাই হয় এবং অডিট লগে থাকে।')}</p>
        </div>
      </div>
      <div className="flex flex-col bg-cream">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <span className="lg:hidden"><Logo compact /></span>
          <div className="ml-auto flex items-center gap-2"><LangToggle /><ThemeToggle /></div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 pb-16">
          <span className="grid h-12 w-12 animate-pop place-items-center rounded-2xl bg-espresso text-cream"><LockKeyhole className="h-5 w-5" /></span>
          <h1 className="h-display mt-5 text-5xl">{L('Staff sign in', 'স্টাফ সাইন ইন')}</h1>
          <p className="mt-2 text-sm text-mocha">{L('For Ruposhi team members only.', 'শুধু রূপসী টিমের জন্য।')}</p>
          <form ref={form} noValidate className="mt-8 space-y-4" onSubmit={(ev) => (ev.preventDefault(), submit())}>
            <TextField label={L('Work email', 'অফিসিয়াল ইমেইল')} type="email" value={email} onChange={(e) => (setEmail(e.target.value), setErr(''))} autoComplete="username" inputMode="email" maxLength={120} autoFocus />
            <PasswordField label={L('Password', 'পাসওয়ার্ড')} value={password} onChange={(e) => (setPassword(e.target.value), setErr(''))} autoComplete="current-password" maxLength={200} />
            {err && <p role="alert" className="animate-fade rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{err}</p>}
            <button disabled={busy} className="btn-primary h-13 w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {L('Sign in', 'সাইন ইন')} {!busy && <ArrowRight className="h-4 w-4" />}</button>
          </form>
          <div className="mt-8 rounded-2xl border border-dashed border-line p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mocha">{L('Demo accounts', 'ডেমো অ্যাকাউন্ট')}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button key={d.email} type="button" disabled={busy} onClick={() => (setEmail(d.email), setPassword(d.password), submit(d.email, d.password))} className="chip justify-center !text-xs">
                  {L(d.en, d.bn)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-mocha">{L('Passwords: Owner@1234, Manager@1234, Orders@1234, Content@1234', 'পাসওয়ার্ড: Owner@1234, Manager@1234, Orders@1234, Content@1234')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

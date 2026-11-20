'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { PasswordField, Strength, passwordIssues } from './Fields';
import { toast } from '../ui/Toast';

/** Current + new password. Changing it signs out every other device (the API bumps the token version). */
export function ChangePasswordForm({ endpoint, admin, onDone }: { endpoint: string; admin?: boolean; onDone?: () => void }) {
  const { lang } = useT();
  const L = (en: string, bn: string) => (lang === 'bn' ? bn : en);
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<{ current?: string; pw?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const e: typeof err = {};
    if (!current) e.current = L('Enter your current password.', 'বর্তমান পাসওয়ার্ড দিন।');
    const issues = passwordIssues(pw, lang);
    if (issues.length) e.pw = issues.join(' · ');
    else if (pw === current) e.pw = L('Choose a different password.', 'ভিন্ন একটি পাসওয়ার্ড দিন।');
    if (confirm !== pw) e.confirm = L('Passwords do not match.', 'পাসওয়ার্ড মিলছে না।');
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await apiFetch(endpoint, { body: { current, password: pw }, admin });
      toast.success(L('Password changed. Other devices were signed out.', 'পাসওয়ার্ড বদলানো হয়েছে। অন্য ডিভাইস থেকে সাইন আউট করা হয়েছে।'));
      setCurrent('');
      setPw('');
      setConfirm('');
      onDone?.();
    } catch (ex) {
      setErr({ form: ex instanceof ApiError ? ex.message : L('Something went wrong.', 'কিছু একটা ভুল হয়েছে।') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form noValidate className="space-y-4" onSubmit={(e) => (e.preventDefault(), submit())}>
      <PasswordField label={L('Current password', 'বর্তমান পাসওয়ার্ড')} value={current} onChange={(e) => setCurrent(e.target.value)} error={err.current} autoComplete="current-password" maxLength={200} />
      <PasswordField label={L('New password', 'নতুন পাসওয়ার্ড')} value={pw} onChange={(e) => setPw(e.target.value)} error={err.pw} autoComplete="new-password" maxLength={72} hint={<Strength value={pw} lang={lang} />} />
      <PasswordField label={L('Confirm new password', 'নতুন পাসওয়ার্ড আবার')} value={confirm} onChange={(e) => setConfirm(e.target.value)} error={err.confirm} autoComplete="new-password" maxLength={72} />
      {err.form && <p role="alert" className="animate-fade rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{err.form}</p>}
      <button disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {L('Update password', 'পাসওয়ার্ড আপডেট করুন')}</button>
    </form>
  );
}

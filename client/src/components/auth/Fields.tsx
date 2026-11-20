'use client';
import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/format';

/** Mirrors the API's password policy so people see problems before submitting. */
export const passwordIssues = (pw: string, lang: string) => {
  const bn = lang === 'bn';
  const out: string[] = [];
  if (pw.length < 8) out.push(bn ? 'কমপক্ষে ৮ অক্ষর' : 'At least 8 characters');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) out.push(bn ? 'অক্ষর ও সংখ্যা দুটোই' : 'A letter and a number');
  if (pw.length > 72) out.push(bn ? 'সর্বোচ্চ ৭২ অক্ষর' : 'At most 72 characters');
  return out;
};

/** 0–4 strength score (length + variety). Visual hint only — the server is the judge. */
const score = (pw: string) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.max(1, s);
};

export function Strength({ value, lang }: { value: string; lang: string }) {
  const s = score(value);
  const labels = lang === 'bn' ? ['', 'দুর্বল', 'মোটামুটি', 'ভালো', 'শক্তিশালী'] : ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const tone = ['bg-line', 'bg-danger', 'bg-terracotta', 'bg-gold', 'bg-success'][s];
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-500', i <= s ? tone : 'bg-line')} />
        ))}
      </div>
      {value && <p className="mt-1 text-[11px] text-mocha">{labels[s]}</p>}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: React.ReactNode };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField({ label, error, hint, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div>
      <label className="label" htmlFor={fid}>{label}</label>
      <input ref={ref} id={fid} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-e` : undefined} className={cn('field', error && '!border-danger', className)} {...rest} />
      {error ? <p id={`${fid}-e`} role="alert" className="mt-1.5 animate-fade text-xs font-medium text-danger">{error}</p> : hint}
    </div>
  );
});

export function PasswordField({ label, error, hint, id, ...rest }: InputProps) {
  const [show, setShow] = useState(false);
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div>
      <label className="label" htmlFor={fid}>{label}</label>
      <div className="relative">
        <input id={fid} type={show ? 'text' : 'password'} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-e` : undefined} className={cn('field pr-12', error && '!border-danger')} {...rest} />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-mocha transition hover:bg-sand hover:text-espresso" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
      {error ? <p id={`${fid}-e`} role="alert" className="mt-1.5 animate-fade text-xs font-medium text-danger">{error}</p> : hint}
    </div>
  );
}

/** 6-digit code field (one input — SMS autofill + paste friendly). */
export function CodeField({ value, onChange, label, error }: { value: string; onChange: (v: string) => void; label: string; error?: string }) {
  return (
    <TextField
      label={label}
      error={error}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="••••••"
      className="h-14 text-center font-mono text-2xl tracking-[0.6em]"
    />
  );
}

'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useL } from '@/components/admin/lib';

/** Admin error boundary: something on this page crashed — the sidebar and the rest of the admin keep working. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const L = useL();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto mt-10 max-w-lg animate-scale-in rounded-3xl border border-line bg-cream p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger"><TriangleAlert className="h-6 w-6" /></span>
      <h1 className="h-display mt-5 text-4xl">{L('This page hit a problem', 'এই পেজে একটা সমস্যা হয়েছে')}</h1>
      <p className="mt-3 text-sm text-mocha">{L('Nothing was lost. Try again, or open another section from the menu.', 'কিছু হারায়নি। আবার চেষ্টা করুন, অথবা মেনু থেকে অন্য অংশে যান।')}</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-mocha">ref: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary"><RotateCcw className="h-4 w-4" /> {L('Try again', 'আবার চেষ্টা')}</button>
        <Link href="/admin" className="btn-ghost">{L('Dashboard', 'ড্যাশবোর্ড')}</Link>
      </div>
    </div>
  );
}

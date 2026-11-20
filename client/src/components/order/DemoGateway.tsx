'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { money } from '@/lib/format';
import { toast } from '../ui/Toast';

/**
 * Sandbox stand-in for the bKash / SSLCommerz hosted page. The server signed `token`
 * (HMAC over order + amount) — tampering with the URL is rejected by /payments/demo/complete.
 * Swap this route for the real gateway redirect when merchant credentials are added.
 */
export function DemoGateway({ gateway, orderNo, amount, token }: { gateway: string; orderNo: string; amount: number; token: string }) {
  const { lang } = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const finish = async (outcome: 'success' | 'failed' | 'cancelled') => {
    setBusy(outcome);
    try {
      const r = await apiFetch<{ payment: string }>('/payments/demo/complete', { body: { orderNo, token, outcome } });
      router.replace(`/order/${orderNo}?payment=${r.payment}`);
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof ApiError ? e.message : 'Payment error');
    }
  };
  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-12">
      <div className="card w-full max-w-md animate-scale-in overflow-hidden">
        <div className="flex items-center gap-2 bg-gold/20 px-5 py-3 text-xs font-semibold"><FlaskConical className="h-4 w-4" /> Demo payment gateway — sandbox, no real money</div>
        <div className="p-6 text-center sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-mocha">{gateway === 'sslcommerz' ? 'Card / mobile banking' : 'bKash checkout'} · {orderNo}</p>
          <p className="mt-4 font-display text-5xl">{money(amount, lang)}</p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-mocha"><ShieldCheck className="h-4 w-4 text-success" /> Signed request verified by the server</p>
          <div className="mt-8 space-y-3">
            <button disabled={!!busy} onClick={() => finish('success')} className="btn-primary h-12 w-full">{busy === 'success' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Simulate successful payment</button>
            <button disabled={!!busy} onClick={() => finish('failed')} className="btn-ghost h-12 w-full">{busy === 'failed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Simulate failure</button>
            <button disabled={!!busy} onClick={() => finish('cancelled')} className="btn-link mx-auto">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

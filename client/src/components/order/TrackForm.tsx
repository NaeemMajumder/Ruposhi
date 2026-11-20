'use client';
import { useRef, useState } from 'react';
import { Loader2, PackageSearch } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { shake } from '@/lib/motion';
import type { OrderView, PublicSettings } from '@/lib/types';
import { OrderDetail } from './OrderDetail';

export function TrackForm({ initialOrderNo = '', settings }: { initialOrderNo?: string; settings?: PublicSettings | null }) {
  const { t } = useT();
  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [order, setOrder] = useState<OrderView | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <div className="space-y-8">
      <form
        ref={ref}
        className="card stagger grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr('');
          try {
            const o = await apiFetch<OrderView>(`/orders/track?orderNo=${encodeURIComponent(orderNo.trim())}&phone=${encodeURIComponent(phone.trim())}`);
            setOrder(o);
          } catch (e2) {
            setOrder(null);
            setErr(e2 instanceof ApiError && e2.status === 404 ? t('track.notFound') : e2 instanceof ApiError ? e2.message : t('errors.generic'));
            shake(ref.current);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <label className="label" htmlFor="t-no">{t('track.orderNo')}</label>
          <input id="t-no" required value={orderNo} onChange={(e) => setOrderNo(e.target.value.toUpperCase())} placeholder="RP-2611-XXXX" className="field font-mono uppercase" />
        </div>
        <div>
          <label className="label" htmlFor="t-phone">{t('checkout.phone')}</label>
          <input id="t-phone" required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="field" />
        </div>
        <button disabled={busy} className="btn-primary h-[50px]">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageSearch className="h-4 w-4" />} {t('track.find')}</button>
        {err && <p className="animate-fade text-sm font-medium text-danger sm:col-span-3" role="alert">{err}</p>}
      </form>
      {order && <div key={order.orderNo} className="animate-scale-in"><OrderDetail o={order} settings={settings} /></div>}
    </div>
  );
}

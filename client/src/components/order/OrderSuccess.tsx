'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, PhoneCall } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch } from '@/lib/client-api';
import { track } from '@/lib/track';
import type { OrderView, PublicSettings } from '@/lib/types';
import { FormSk } from '../ui/Skeletons';
import { Petals, SuccessMark } from './Celebrate';
import { OrderDetail } from './OrderDetail';
import { TrackForm } from './TrackForm';

export function OrderSuccess({ orderNo, settings, payment }: { orderNo: string; settings: PublicSettings | null; payment?: string }) {
  const { t } = useT();
  const [o, setO] = useState<OrderView | null | undefined>(undefined);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    let stored: OrderView | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(`ruposhi-order-${orderNo}`) ?? 'null');
    } catch {
      /* ignore */
    }
    setO(stored);
    if (!stored) return;
    // browser Purchase pixel — same eventId the API sent via Conversions API → Meta dedups
    const flag = `ruposhi-purchase-${orderNo}`;
    if (!sessionStorage.getItem(flag)) {
      sessionStorage.setItem(flag, '1');
      track('purchase', { eventId: `purchase_${orderNo}`, value: stored.pricing.total, contentIds: stored.items.map((i) => i.slug) });
    }
    // refresh (payment status may have changed after a gateway redirect)
    apiFetch<OrderView>(`/orders/track?orderNo=${orderNo}&phone=${stored.customer.phone}`)
      .then((fresh) => (setO(fresh), sessionStorage.setItem(`ruposhi-order-${orderNo}`, JSON.stringify(fresh))))
      .catch(() => {});
  }, [orderNo]);

  if (o === undefined) return <FormSk />;
  if (!o)
    return (
      <div className="container-x max-w-3xl py-10">
        <h1 className="h-display mb-6 text-5xl">{t('track.title')}</h1>
        <TrackForm initialOrderNo={orderNo} settings={settings} />
      </div>
    );

  return (
    <div className="container-x max-w-3xl pb-20 pt-8">
      {payment !== 'failed' && <Petals />}
      <div className="flex flex-col items-center text-center">
        <SuccessMark />
        <h1 className="h-display mt-5 animate-rise text-[40px] [animation-delay:.3s] sm:text-[56px]">{t('order.thanks', { name: o.customer.name.split(' ')[0] })}</h1>
        <p className="mt-2 animate-rise text-mocha [animation-delay:.45s]">{payment === 'failed' ? (t('order.payStatuses.failed')) : t('order.placed')}</p>
        <p className="mt-4 inline-flex animate-rise items-center gap-2 rounded-full bg-sand px-4 py-2 text-sm [animation-delay:.6s]"><PhoneCall className="h-4 w-4 text-bronze" /> {t('order.confirmCall')}</p>
      </div>
      <div className="mt-10 animate-rise [animation-delay:.7s]">
        <OrderDetail o={o} settings={settings} />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
        <Link href="/track" className="btn-ghost">{t('order.track')}</Link>
        <Link href="/shop" className="btn-primary">{t('order.continue')} <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Circle, Copy, Loader2, Package, Printer, Truck, XCircle } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num, toBnDigits, tr } from '@/lib/format';
import { shake } from '@/lib/motion';
import type { OrderView, PublicSettings } from '@/lib/types';
import { toast } from '../ui/Toast';

const FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

/** Status stepper: completed steps fill in sequence, the current one pulses. */
export function Timeline({ o }: { o: OrderView }) {
  const { t, lang } = useT();
  const stopped = ['cancelled', 'returned'].includes(o.status);
  const cur = FLOW.indexOf(o.status);
  const when = (s: string) => o.timeline.find((x) => x.status === s)?.at;
  return (
    <div>
      <ol className="relative grid grid-cols-5 gap-1">
        <span className="absolute left-[10%] right-[10%] top-[18px] h-0.5 bg-line" aria-hidden="true" />
        <span className="absolute left-[10%] top-[18px] h-0.5 origin-left bg-gold transition-all duration-1000" style={{ width: `${Math.max(0, cur) * 20}%`, animation: 'progress 1.2s var(--ease-silk) both' }} aria-hidden="true" />
        {FLOW.map((s, k) => {
          const done = !stopped && k <= cur;
          const Icon = k === 3 ? Truck : k === 4 ? Package : Check;
          return (
            <li key={s} className="relative flex flex-col items-center text-center" style={{ animation: `rise .6s var(--ease-silk) ${k * 120}ms both` }}>
              <span className={cn('relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 transition-colors duration-500', done ? 'border-gold bg-gold text-night' : 'border-line bg-cream text-mocha', k === cur && !stopped && 'ring-4 ring-gold/25')}>
                {done ? <Icon className="h-4 w-4" /> : <Circle className="h-2 w-2 fill-current" />}
                {k === cur && !stopped && k < 4 && <span className="absolute inset-0 animate-ping rounded-full bg-gold/30" />}
              </span>
              <span className={cn('mt-2 text-[11px] font-semibold leading-tight sm:text-xs', !done && 'text-mocha')}>{t(`order.statuses.${s}`)}</span>
              {when(s) && <span className="mt-0.5 hidden text-[10px] text-mocha sm:block">{dateFmt(when(s)!, lang)}</span>}
            </li>
          );
        })}
      </ol>
      {stopped && <p className="mt-5 flex items-center gap-2 rounded-xl bg-maroon/10 px-4 py-3 text-sm font-semibold text-maroon"><XCircle className="h-4 w-4" /> {t(`order.statuses.${o.status}`)}</p>}
    </div>
  );
}

export function OrderDetail({ o, settings, showPayment = true }: { o: OrderView; settings?: PublicSettings | null; showPayment?: boolean }) {
  const { t, lang } = useT();
  const pr = o.pricing;
  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-mocha">{t('order.number')}</p>
            <p className="font-mono text-lg font-semibold">{o.orderNo}</p>
          </div>
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold">{t(`order.payStatuses.${o.payment.status}`)}</span>
        </div>
        <Timeline o={o} />
        {o.shipping.courier && (
          <p className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-blush px-4 py-3 text-sm">
            <Truck className="h-4 w-4 text-bronze" /> {t('order.courier')}: <span className="font-semibold capitalize">{o.shipping.courier}</span>
            {o.shipping.consignmentId && <span className="font-mono text-xs">#{o.shipping.consignmentId}</span>}
            {o.shipping.trackingUrl && <a href={o.shipping.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-link ml-auto">{t('order.track')}</a>}
          </p>
        )}
      </div>

      {showPayment && <PaymentAction o={o} settings={settings} />}

      <div className="card p-5 sm:p-6">
        <h3 className="mb-4 font-display text-2xl">{t('order.items')}</h3>
        <ul className="divide-y divide-line">
          {o.items.map((i, k) => (
            <li key={i.sku} className="flex items-center gap-3 py-3" style={{ animation: `rise .5s var(--ease-silk) ${k * 60}ms both` }}>
              <Link href={`/product/${i.slug}`} className="arch-soft media relative h-20 w-[60px] shrink-0 overflow-hidden"><Image src={i.image} alt="" fill sizes="60px" className="object-cover" /></Link>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">{tr(i.name, lang)}</p>
                <p className="text-xs text-mocha">{i.color} · {i.size} · ×{num(i.qty, lang)}</p>
              </div>
              <span className="text-sm tabular-nums">{money(i.lineTotal, lang)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <Row k={t('cart.subtotal')} v={money(pr.subtotal, lang)} />
          {pr.discount > 0 && <Row k={`${t('cart.discount')}${pr.couponCode ? ` (${pr.couponCode})` : ''}`} v={`−${money(pr.discount, lang)}`} cls="text-success" />}
          {pr.giftWrap > 0 && <Row k={t('cart.giftWrap')} v={money(pr.giftWrap, lang)} />}
          <Row k={t('cart.delivery')} v={pr.deliveryCharge ? money(pr.deliveryCharge, lang) : t('common.free')} />
          <Row k={t('cart.total')} v={money(pr.total, lang)} cls="border-t border-line pt-3 text-base font-semibold" />
          {pr.advancePaid > 0 && <Row k={t('order.paid')} v={money(pr.advancePaid, lang)} cls="text-success" />}
          {pr.due > 0 && <Row k={t('order.due')} v={money(pr.due, lang)} cls="font-semibold" />}
        </dl>
      </div>

      <div className="card grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6">
        <div>
          <p className="eyebrow mb-2">{t('checkout.shipping')}</p>
          <p className="font-semibold">{o.customer.name}</p>
          <p className="text-mocha">{lang === 'bn' ? toBnDigits(o.customer.phone) : o.customer.phone}</p>
          <p className="mt-1 text-mocha">{o.shippingAddress.address}{o.shippingAddress.landmark ? `, ${o.shippingAddress.landmark}` : ''}, {o.shippingAddress.area}, {o.shippingAddress.district}, {o.shippingAddress.division}</p>
        </div>
        <div>
          <p className="eyebrow mb-2">{t('checkout.payment')}</p>
          <p className="font-semibold">{methodLabel(o.payment.method, t)}</p>
          <p className="text-mocha">{t(`order.payStatuses.${o.payment.status}`)}</p>
          <p className="mt-1 text-xs text-mocha">{dateFmt(o.createdAt, lang, true)}</p>
        </div>
      </div>
      <button onClick={() => window.print()} className="btn-ghost print:hidden"><Printer className="h-4 w-4" /> {lang === 'bn' ? 'ইনভয়েস প্রিন্ট' : 'Print invoice'}</button>
    </div>
  );
}

const Row = ({ k, v, cls }: { k: string; v: string; cls?: string }) => (
  <div className={cn('flex justify-between gap-4', cls)}><dt className="text-mocha">{k}</dt><dd className="tabular-nums">{v}</dd></div>
);

export const methodLabel = (m: string, t: (k: string) => string) =>
  ({ cod: t('checkout.cod'), bkash_manual: t('checkout.bkashManual'), nagad_manual: t('checkout.nagadManual'), bkash: t('checkout.bkash'), sslcommerz: t('checkout.ssl') })[m] ?? m;

/** Manual bKash/Nagad TrxID submission or gateway retry for unpaid online orders. */
function PaymentAction({ o, settings }: { o: OrderView; settings?: PublicSettings | null }) {
  const { t, lang } = useT();
  const [trx, setTrx] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(o.payment.status === 'pending_verification');
  const manual = o.payment.method === 'bkash_manual' || o.payment.method === 'nagad_manual';
  const online = o.payment.method === 'bkash' || o.payment.method === 'sslcommerz';
  if (!['unpaid', 'failed', 'pending_verification'].includes(o.payment.status) || (!manual && !online)) return null;
  const number = o.payment.method === 'nagad_manual' ? settings?.payments.nagadNumber : settings?.payments.bkashNumber;
  const amount = o.pricing.due || o.pricing.total;

  if (done)
    return <p className="card flex animate-scale-in items-center gap-3 p-5 text-sm font-semibold text-success"><Check className="h-5 w-5" /> {t('order.trxSubmitted')}</p>;

  if (online)
    return (
      <div className="card flex flex-wrap items-center justify-between gap-4 border-gold p-5">
        <p className="text-sm">{t('order.payNow')} · <span className="font-semibold">{money(amount, lang)}</span></p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const g = await apiFetch<{ redirectUrl: string }>(`/payments/${o.orderNo}/init`, { body: { phone: o.customer.phone } });
              window.location.href = g.redirectUrl;
            } catch (e) {
              setBusy(false);
              toast.error(e instanceof ApiError ? e.message : t('errors.generic'));
            }
          }}
          className="btn-gold"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t('order.payNow')}
        </button>
      </div>
    );

  return (
    <form
      className="card animate-scale-in border-gold p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        try {
          await apiFetch(`/payments/${o.orderNo}/manual`, { body: { phone: o.customer.phone, trxId: trx.trim() } });
          setDone(true);
        } catch (err) {
          shake(form);
          toast.error(err instanceof ApiError ? err.message : t('errors.generic'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-display text-2xl">{t('order.payNow')}</p>
      <p className="mt-2 text-sm text-mocha">{t('order.trxPrompt', { amount: money(amount, lang), number: number ?? '', method: o.payment.method === 'nagad_manual' ? 'Nagad' : 'bKash' })}</p>
      {number && (
        <button type="button" onClick={() => navigator.clipboard.writeText(number).then(() => toast.info(t('common.copied')))} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-sand px-4 py-2 font-mono text-lg font-semibold tracking-wider transition active:scale-95">
          {number} <Copy className="h-4 w-4 text-bronze" />
        </button>
      )}
      <div className="mt-4 flex gap-2">
        <label className="sr-only" htmlFor="trx">{t('order.trxId')}</label>
        <input id="trx" value={trx} onChange={(e) => setTrx(e.target.value.toUpperCase())} required minLength={6} maxLength={20} placeholder={t('order.trxId')} className="field flex-1 font-mono uppercase tracking-wider" />
        <button disabled={busy || trx.trim().length < 6} className="btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('order.submitTrx')}</button>
      </div>
    </form>
  );
}

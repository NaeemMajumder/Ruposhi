'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ArrowLeft, BadgeCheck, Check, Copy, ExternalLink, Loader2, MapPin, MessageSquareText, Minus, PhoneCall, Plus, Printer, Send, ShieldAlert, Truck, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num, tr } from '@/lib/format';
import { toast } from '../../ui/Toast';
import { DashboardSk } from '../../ui/Skeletons';
import { Modal } from '../../ui/Sheet';
import { COURIERS, lbl } from '../labels';
import { useAdmin, useCan, useL } from '../lib';
import type { AdminOrder } from '../types';
import { Badge, ErrorBox, Panel } from '../ui';

type Fraud = { phone: string; storeHistory: { total: number; delivered: number; cancelled: number; returned: number; successRate: number | null }; courierNetwork: { courier: string; total: number; success: number; rate: number | null }[]; combinedSuccessRate: number | null; risk: 'low' | 'medium' | 'high'; blocked: boolean };
type Detail = { order: AdminOrder; fraud: Fraud; allowedNext: string[]; sms: { _id: string; template: string; message: string; status: string; createdAt: string }[] };

export function OrderAdmin({ id }: { id: string }) {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const { data, error, reload } = useAdmin<Detail>(`/admin/orders/${id}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const m = (n: number) => money(n, lang);

  const act = async (key: string, path: string, body: unknown, method = 'POST', okMsg?: string) => {
    setBusy(key);
    try {
      await apiFetch(path, { admin: true, method, body });
      toast.success(okMsg ?? L('Saved', 'সেভ হয়েছে'));
      reload();
      return true;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (error && !data) return <ErrorBox msg={error.message} onRetry={reload} />;
  if (!data) return <DashboardSk />;
  const { order: o, fraud: f, allowedNext } = data;
  const canEdit = can('orders.update');
  const riskTone = f.risk === 'high' ? 'border-danger/40 bg-danger/5' : f.risk === 'medium' ? 'border-gold/50 bg-gold/10' : 'border-success/30 bg-success/5';

  return (
    <div className="print:text-black">
      <Link href="/admin/orders" className="btn-link mb-4 print:hidden"><ArrowLeft className="h-4 w-4" /> {L('Orders', 'অর্ডার')}</Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-rise">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-semibold sm:text-3xl">{o.orderNo}</h1>
            <button onClick={() => navigator.clipboard.writeText(o.orderNo).then(() => toast.info(L('Copied', 'কপি হয়েছে')))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand print:hidden" aria-label="Copy"><Copy className="h-4 w-4" /></button>
            <Badge v={o.status} label={lbl(o.status, lang)} />
            <Badge v={o.payment.status} label={lbl(o.payment.status, lang)} />
          </div>
          <p className="mt-1 text-sm text-mocha">{dateFmt(o.createdAt, lang, true)} · {lbl(o.source?.channel ?? 'direct', lang)}{o.source?.utm_campaign ? ` · ${o.source.utm_campaign}` : ''}</p>
        </div>
        <button onClick={() => window.print()} className="btn-ghost !min-h-10 print:hidden"><Printer className="h-4 w-4" /> {L('Print invoice', 'ইনভয়েস প্রিন্ট')}</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* status actions */}
          {canEdit && allowedNext.length > 0 && (
            <Panel title={L('Next step', 'পরের ধাপ')} className="print:hidden">
              <input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={300} placeholder={L('Note for timeline (optional)', 'টাইমলাইনের নোট (ঐচ্ছিক)')} className="field mb-3 text-sm" />
              <div className="flex flex-wrap gap-2">
                {allowedNext.map((s) => (
                  <button key={s} disabled={!!busy} onClick={async () => (await act(`st-${s}`, `/admin/orders/${o._id}/status`, { status: s, note: statusNote || undefined }, 'PATCH', `→ ${lbl(s, lang)}`)) && setStatusNote('')}
                    className={cn(['cancelled', 'returned'].includes(s) ? 'btn-ghost hover:!border-danger hover:!bg-danger hover:!text-ivory' : 'btn-primary', '!min-h-10')}>
                    {busy === `st-${s}` && <Loader2 className="h-4 w-4 animate-spin" />} {lbl(s, lang)}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-mocha">{L('Customers get an SMS on confirm, ship and delivery. Cancel/return restocks inventory automatically.', 'কনফার্ম, শিপ ও ডেলিভারিতে কাস্টমার SMS পায়। বাতিল/রিটার্নে স্টক নিজে থেকে ফেরত যায়।')}</p>
            </Panel>
          )}

          {/* items */}
          <Panel title={`${L('Items', 'পণ্য')} (${num(o.items.reduce((s, i) => s + i.qty, 0), lang)})`} action={canEdit && ['pending', 'confirmed', 'processing'].includes(o.status) && <button onClick={() => setEditOpen(true)} className="btn-link text-xs print:hidden">{L('Edit items', 'পণ্য এডিট')}</button>} bodyClass="p-0">
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.sku} className="flex items-center gap-3 px-5 py-3">
                  <span className="media relative h-14 w-11 shrink-0 overflow-hidden rounded-lg"><Image src={i.image} alt="" fill sizes="44px" className="object-cover" /></span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${i.slug}`} target="_blank" className="line-clamp-1 text-sm font-medium hover:text-bronze">{tr(i.name, lang)}</Link>
                    <p className="font-mono text-[11px] text-mocha">{i.sku} · {i.color} · {i.size}</p>
                  </div>
                  <span className="text-sm tabular-nums text-mocha">{m(i.price)} × {num(i.qty, lang)}</span>
                  <span className="w-24 text-right text-sm font-semibold tabular-nums">{m(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-sm">
              {[
                [L('Subtotal', 'সাবটোটাল'), m(o.pricing.subtotal)],
                ...(o.pricing.discount ? [[`${L('Discount', 'ছাড়')}${o.pricing.couponCode ? ` (${o.pricing.couponCode})` : ''}`, `−${m(o.pricing.discount)}`]] : []),
                ...(o.pricing.giftWrap ? [[L('Gift wrap', 'গিফট র‍্যাপ'), m(o.pricing.giftWrap)]] : []),
                [`${L('Delivery', 'ডেলিভারি')} · ${lbl(o.shipping.zone, lang)}`, m(o.pricing.deliveryCharge)],
              ].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-mocha">{k}</dt><dd className="tabular-nums">{v}</dd></div>)}
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>{L('Total', 'মোট')}</dt><dd className="tabular-nums">{m(o.pricing.total)}</dd></div>
              {o.pricing.advancePaid > 0 && <div className="flex justify-between text-success"><dt>{L('Paid', 'পরিশোধিত')}</dt><dd>{m(o.pricing.advancePaid)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>{L('Collect on delivery', 'ডেলিভারিতে সংগ্রহ')}</dt><dd>{m(o.pricing.due)}</dd></div>
              <p className="pt-1 text-xs text-mocha">{L('Gross margin', 'মার্জিন')}: {m(o.items.reduce((s, i) => s + (i.price - i.costPrice) * i.qty, 0) - o.pricing.discount)}</p>
            </dl>
          </Panel>

          {/* timeline */}
          <Panel title={L('Timeline', 'টাইমলাইন')}>
            <ol className="relative space-y-4 border-l-2 border-line pl-5">
              {[...o.timeline].reverse().map((t, i) => (
                <li key={i} className="relative" style={{ animation: `rise .5s var(--ease-silk) ${i * 50}ms both` }}>
                  <span className={cn('absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-surface', i === 0 ? 'bg-gold' : 'bg-line')} />
                  <p className="text-sm"><Badge v={t.status} label={lbl(t.status, lang)} /> <span className="ml-1 text-xs text-mocha">{dateFmt(t.at, lang, true)} · {t.by}</span></p>
                  {t.note && <p className="mt-1 text-sm text-mocha">{t.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>

          {/* notes */}
          <Panel title={L('Internal notes', 'ইন্টারনাল নোট')} className="print:hidden">
            {o.customerNote && <p className="mb-3 rounded-xl bg-gold/10 p-3 text-sm"><b>{L('Customer note', 'কাস্টমারের নোট')}:</b> {o.customerNote}</p>}
            <ul className="space-y-2">
              {o.notes.map((n, i) => <li key={i} className="rounded-xl bg-sand px-3 py-2 text-sm">{n.text}<p className="mt-0.5 text-[11px] text-mocha">{n.by} · {dateFmt(n.at, lang, true)}</p></li>)}
            </ul>
            {canEdit && (
              <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (note.trim() && (await act('note', `/admin/orders/${o._id}/notes`, { text: note }))) setNote(''); }}>
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={L('Add a note…', 'নোট লিখুন…')} className="field flex-1 text-sm" />
                <button disabled={!note.trim() || busy === 'note'} className="btn-primary !min-h-11 !px-4" aria-label="Add note">{busy === 'note' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </form>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {/* customer */}
          <Panel title={L('Customer', 'কাস্টমার')}>
            <p className="font-semibold">{o.customer.name}</p>
            <div className="mt-2 flex flex-wrap gap-2 print:hidden">
              <a href={`tel:${o.customer.phone}`} className="chip !min-h-8 !text-xs"><PhoneCall className="h-3.5 w-3.5" /> {o.customer.phone}</a>
              <a href={`https://wa.me/88${o.customer.phone}`} target="_blank" rel="noopener noreferrer" className="chip !min-h-8 !text-xs">WhatsApp</a>
              {o.customerId && <Link href={`/admin/customers?q=${o.customer.phone}`} className="chip !min-h-8 !text-xs">{L('Profile', 'প্রোফাইল')}</Link>}
            </div>
            {o.customer.email && <p className="mt-2 text-sm text-mocha">{o.customer.email}</p>}
            <p className="mt-3 flex gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />{o.shippingAddress.address}{o.shippingAddress.landmark ? `, ${o.shippingAddress.landmark}` : ''}, {o.shippingAddress.area}, {o.shippingAddress.district}, {o.shippingAddress.division}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs print:hidden">
              <span className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-2', o.flags.otpVerified ? 'bg-success/10 text-success' : 'bg-sand text-mocha')}>{o.flags.otpVerified ? <BadgeCheck className="h-4 w-4" /> : <X className="h-4 w-4" />} OTP</span>
              <button disabled={!canEdit || busy === 'call'} onClick={() => act('call', `/admin/orders/${o._id}/call-confirm`, { value: !o.flags.callConfirmed })} className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left transition', o.flags.callConfirmed ? 'bg-success/10 text-success' : 'bg-sand text-mocha hover:bg-gold/20')}>
                {busy === 'call' ? <Loader2 className="h-4 w-4 animate-spin" /> : o.flags.callConfirmed ? <Check className="h-4 w-4" /> : <PhoneCall className="h-4 w-4" />} {L('Call confirmed', 'কল কনফার্মড')}
              </button>
            </div>
          </Panel>

          {/* fraud */}
          <Panel title={<span className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4 text-bronze" /> {L('Fraud check', 'ফ্রড চেক')}</span>} className={cn('border', riskTone)} >
            <div className="flex items-end justify-between">
              <div>
                <p className="font-display text-4xl">{f.combinedSuccessRate != null ? `${f.combinedSuccessRate}%` : '—'}</p>
                <p className="text-xs text-mocha">{L('delivery success (store + courier network)', 'ডেলিভারি সাফল্য (স্টোর + কুরিয়ার)')}</p>
              </div>
              <Badge v={f.risk} label={`${f.risk} ${L('risk', 'ঝুঁকি')}`} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-mocha">{L('This store', 'এই স্টোর')}</span><span>{num(f.storeHistory.delivered, lang)}/{num(f.storeHistory.total, lang)} · ✕{num(f.storeHistory.cancelled + f.storeHistory.returned, lang)}</span></div>
              {f.courierNetwork.map((c) => (
                <div key={c.courier}>
                  <div className="flex justify-between text-xs"><span className="capitalize">{c.courier}</span><span className="tabular-nums">{c.total ? `${c.success}/${c.total} · ${c.rate}%` : '—'}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand"><div className="h-full origin-left rounded-full bg-success" style={{ width: `${c.rate ?? 0}%`, animation: 'progress .9s var(--ease-silk) both' }} /></div>
                </div>
              ))}
            </div>
            {f.blocked && <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-danger"><AlertTriangle className="h-4 w-4" /> {L('Blocked customer', 'ব্লক করা কাস্টমার')}</p>}
            <p className="mt-3 text-[11px] text-mocha">{L('Courier network data is a demo stub — connect Steadfast/Pathao fraud APIs with real keys.', 'কুরিয়ার নেটওয়ার্ক ডেটা ডেমো — আসল কী দিয়ে স্টেডফাস্ট/পাঠাও ফ্রড API যুক্ত করুন।')}</p>
          </Panel>

          {/* payment */}
          <Panel title={L('Payment', 'পেমেন্ট')}>
            <p className="text-sm font-semibold">{lbl(o.payment.method, lang)}</p>
            <p className="text-sm text-mocha">{lbl(o.payment.status, lang)} · {L('paid', 'পরিশোধিত')} {m(o.payment.paidAmount)}</p>
            {o.payment.trxId && <p className="mt-2 rounded-lg bg-sand px-3 py-2 font-mono text-sm">TrxID: {o.payment.trxId}</p>}
            {o.payment.gatewayRef && <p className="mt-2 font-mono text-xs text-mocha">ref: {o.payment.gatewayRef}</p>}
            {canEdit && o.payment.status === 'pending_verification' && (
              <div className="mt-3 grid grid-cols-2 gap-2 print:hidden">
                <button disabled={!!busy} onClick={() => act('pay-ok', `/admin/orders/${o._id}/verify-payment`, { approve: true }, 'POST', L('Payment approved', 'পেমেন্ট অনুমোদিত'))} className="btn-primary !min-h-10">{busy === 'pay-ok' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{L('Approve', 'অনুমোদন')}</button>
                <button disabled={!!busy} onClick={() => act('pay-no', `/admin/orders/${o._id}/verify-payment`, { approve: false })} className="btn-ghost !min-h-10">{L('Reject', 'বাতিল')}</button>
              </div>
            )}
          </Panel>

          {/* courier */}
          <Panel title={<span className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4 text-bronze" /> {L('Courier', 'কুরিয়ার')}</span>} className="print:hidden">
            {o.shipping.courier ? (
              <div className="text-sm">
                <p className="font-semibold capitalize">{o.shipping.courier}</p>
                <p className="font-mono text-xs">#{o.shipping.consignmentId}</p>
                {o.shipping.bookedAt && <p className="text-xs text-mocha">{dateFmt(o.shipping.bookedAt, lang, true)}</p>}
                {o.shipping.trackingUrl && <a href={o.shipping.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-link mt-2 text-xs">{L('Track parcel', 'পার্সেল ট্র্যাক')} <ExternalLink className="h-3 w-3" /></a>}
              </div>
            ) : canEdit && ['confirmed', 'processing'].includes(o.status) ? (
              <div className="grid grid-cols-3 gap-2">
                {COURIERS.map((c) => (
                  <button key={c} disabled={!!busy} onClick={() => act(`c-${c}`, `/admin/orders/${o._id}/courier`, { courier: c }, 'POST', L('Parcel booked', 'পার্সেল বুক হয়েছে'))} className="chip !min-h-10 justify-center capitalize">{busy === `c-${c}` ? <Loader2 className="h-4 w-4 animate-spin" /> : c}</button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-mocha">{L('Confirm the order to book a courier.', 'কুরিয়ার বুক করতে আগে অর্ডার কনফার্ম করুন।')}</p>
            )}
          </Panel>

          {/* sms */}
          <Panel title={<span className="flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="h-4 w-4 text-bronze" /> SMS</span>} className="print:hidden">
            {data.sms.length === 0 ? <p className="text-sm text-mocha">—</p> : (
              <ul className="space-y-2">{data.sms.map((s) => <li key={s._id} className="rounded-xl bg-sand px-3 py-2 text-xs"><p className="font-semibold">{s.template} · <span className="font-normal text-mocha">{dateFmt(s.createdAt, lang, true)}</span></p><p className="mt-0.5 text-mocha">{s.message}</p></li>)}</ul>
            )}
          </Panel>
        </div>
      </div>

      <Modal open={editOpen} onOpenChange={setEditOpen} title={L('Edit items', 'পণ্য এডিট')}>
        <EditItems o={o} onDone={() => (setEditOpen(false), reload())} />
      </Modal>
    </div>
  );
}

function EditItems({ o, onDone }: { o: AdminOrder; onDone: () => void }) {
  const { lang } = useT();
  const L = useL();
  const [qty, setQty] = useState<Record<string, number>>(Object.fromEntries(o.items.map((i) => [i.sku, i.qty])));
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <ul className="divide-y divide-line">
        {o.items.map((i) => (
          <li key={i.sku} className={cn('flex items-center gap-3 py-3 transition-opacity', qty[i.sku] === 0 && 'opacity-40')}>
            <span className="min-w-0 flex-1 text-sm">{tr(i.name, lang)}<span className="block text-xs text-mocha">{i.size} · {money(i.price, lang)}</span></span>
            <div className="inline-flex items-center rounded-full border border-line">
              <button onClick={() => setQty((q) => ({ ...q, [i.sku]: Math.max(0, q[i.sku] - 1) }))} className="grid h-9 w-9 place-items-center" aria-label="Decrease"><Minus className="h-3.5 w-3.5" /></button>
              <span className="w-6 text-center text-sm tabular-nums">{qty[i.sku]}</span>
              <button onClick={() => setQty((q) => ({ ...q, [i.sku]: Math.min(10, q[i.sku] + 1) }))} className="grid h-9 w-9 place-items-center" aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-mocha">{L('Set to 0 to remove. Stock and totals are recalculated; the change is logged.', '০ দিলে বাদ যাবে। স্টক ও টোটাল আবার হিসাব হবে; পরিবর্তন লগ হবে।')}</p>
      <button disabled={busy} className="btn-primary mt-4 h-12 w-full" onClick={async () => {
        setBusy(true);
        try {
          await apiFetch(`/admin/orders/${o._id}/items`, { admin: true, method: 'PATCH', body: { items: Object.entries(qty).map(([sku, q]) => ({ sku, qty: q })) } });
          toast.success(L('Order updated', 'অর্ডার আপডেট হয়েছে'));
          onDone();
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : 'Error');
        } finally {
          setBusy(false);
        }
      }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{L('Save changes', 'সেভ করুন')}</button>
    </div>
  );
}

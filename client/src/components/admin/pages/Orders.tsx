'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, BadgeCheck, CheckCheck, Loader2, PhoneCall } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num } from '@/lib/format';
import { toast } from '../../ui/Toast';
import { CHANNELS, COURIERS, lbl, ORDER_STATUSES, PAY_METHODS, PAY_STATUSES } from '../labels';
import { useAdmin, useCan, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { AdminOrder, Paged } from '../types';
import { Badge, DataTable, DateRange, ExportButton, FilterBar, MultiSelect, PageHead, Pager, SearchBox, type Col } from '../ui';

type Res = Paged<AdminOrder> & { counts: Record<string, number>; totals: { revenue: number } };

export function Orders() {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const router = useRouter();
  const { state, set, qs } = useUrlState();
  const query = qs({ limit: PAGE_SIZE });
  const { data, loading, reload } = useAdmin<Res>(`/admin/orders?${query}`);
  const [sel, setSel] = useState<string[]>([]);
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);
  const opts = (arr: string[]) => arr.map((v) => ({ value: v, label: lbl(v, lang) }));
  const m = (n: number) => money(n, lang);

  const applyBulk = async () => {
    if (!bulk || !sel.length) return;
    setBusy(true);
    try {
      const r = await apiFetch<{ updated: number; failed: { id: string; reason: string }[] }>('/admin/orders/bulk-status', { admin: true, body: { ids: sel, status: bulk } });
      toast.success(`${num(r.updated ?? sel.length, lang)} ${L('orders updated', 'অর্ডার আপডেট হয়েছে')}`);
      if (r.failed?.length) toast.error(`${r.failed.length} ${L('skipped (invalid transition)', 'বাদ পড়েছে (অবৈধ ধাপ)')}`);
      setSel([]);
      setBulk('');
      reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const cols: Col<AdminOrder>[] = [
    { key: 'no', head: L('Order', 'অর্ডার'), sort: 'createdAt', cell: (o) => (<div><p className="font-mono text-xs font-semibold">{o.orderNo}</p><p className="text-[11px] text-mocha">{dateFmt(o.createdAt, lang, true)}</p></div>) },
    { key: 'cust', head: L('Customer', 'কাস্টমার'), sort: 'customer', cell: (o) => (<div><p className="font-medium">{o.customer.name}</p><p className="text-[11px] text-mocha">{o.customer.phone} · {o.shippingAddress.district}</p></div>) },
    { key: 'items', head: L('Items', 'পণ্য'), hideSm: true, cell: (o) => <span className="text-mocha">{num(o.items.reduce((s, i) => s + i.qty, 0), lang)}</span> },
    { key: 'pay', head: L('Payment', 'পেমেন্ট'), hideSm: true, cell: (o) => (<div className="space-y-1"><p className="text-xs">{lbl(o.payment.method, lang)}</p><Badge v={o.payment.status} label={lbl(o.payment.status, lang)} /></div>) },
    { key: 'status', head: L('Status', 'স্ট্যাটাস'), cell: (o) => <Badge v={o.status} label={lbl(o.status, lang)} /> },
    {
      key: 'flags', head: L('Checks', 'যাচাই'), hideSm: true,
      cell: (o) => (
        <div className="flex items-center gap-1.5">
          {o.flags.otpVerified && <BadgeCheck className="h-4 w-4 text-success" aria-label="OTP verified" />}
          {o.flags.callConfirmed && <PhoneCall className="h-4 w-4 text-success" aria-label="Call confirmed" />}
          {o.flags.fraudRisk !== 'low' && <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', o.flags.fraudRisk === 'high' ? 'text-danger' : 'text-bronze')}><AlertTriangle className="h-3.5 w-3.5" />{o.flags.fraudRisk}</span>}
        </div>
      ),
    },
    { key: 'ch', head: L('Channel', 'চ্যানেল'), hideSm: true, cell: (o) => <span className="text-xs text-mocha">{lbl(o.source?.channel ?? 'direct', lang)}</span> },
    { key: 'total', head: L('Total', 'মোট'), sort: 'total', className: 'text-right', cell: (o) => <span className="font-semibold tabular-nums">{m(o.pricing.total)}</span> },
  ];

  const tabs = ['', ...ORDER_STATUSES];
  return (
    <div>
      <PageHead
        title={L('Orders', 'অর্ডার')}
        sub={data ? `${num(data.total, lang)} ${L('orders', 'টি অর্ডার')} · ${m(data.totals.revenue)} ${L('in view', 'এই ভিউতে')}` : undefined}
        actions={can('orders.export') && <ExportButton path={`/admin/orders/export?${qs()}`} />}
      />
      <div className="scrollbar-none mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((s) => {
          const on = (state.status ?? '') === s;
          return (
            <button key={s || 'all'} onClick={() => set({ status: s || undefined })} className={cn('relative flex min-h-11 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold transition-colors', on ? 'text-espresso' : 'text-mocha hover:text-espresso')}>
              {s ? lbl(s, lang) : L('All', 'সব')}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', on ? 'bg-espresso text-cream' : 'bg-sand')}>{num(data?.counts[s || 'all'] ?? 0, lang)}</span>
              {on && <span className="absolute inset-x-2 bottom-0 h-0.5 animate-[progress_.4s_var(--ease-silk)_both] rounded-full bg-gold" />}
            </button>
          );
        })}
      </div>
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Order no, name, phone…', 'অর্ডার নং, নাম, ফোন…')} />
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <MultiSelect label={L('Payment', 'পেমেন্ট')} value={state.paymentMethod ?? ''} onChange={(v) => set({ paymentMethod: v || undefined })} options={opts(PAY_METHODS)} />
        <MultiSelect label={L('Pay status', 'পেমেন্ট স্ট্যাটাস')} value={state.paymentStatus ?? ''} onChange={(v) => set({ paymentStatus: v || undefined })} options={opts(PAY_STATUSES)} />
        <MultiSelect label={L('Channel', 'চ্যানেল')} value={state.channel ?? ''} onChange={(v) => set({ channel: v || undefined })} options={opts(CHANNELS)} />
        <MultiSelect label={L('Courier', 'কুরিয়ার')} value={state.courier ?? ''} onChange={(v) => set({ courier: v || undefined })} options={opts(COURIERS)} />
        <MultiSelect label={L('Risk', 'ঝুঁকি')} value={state.risk ?? ''} onChange={(v) => set({ risk: v || undefined })} options={['low', 'medium', 'high'].map((v) => ({ value: v, label: v }))} />
        {Object.keys(state).some((k) => !['page', 'sort'].includes(k)) && <button onClick={() => router.replace('/admin/orders')} className="btn-link text-xs">{L('Reset filters', 'ফিল্টার মুছুন')}</button>}
      </FilterBar>

      {sel.length > 0 && can('orders.update') && (
        <div className="sticky top-16 z-20 mb-3 flex animate-scale-in flex-wrap items-center gap-3 rounded-2xl bg-espresso px-4 py-3 text-sm text-cream shadow-xl">
          <CheckCheck className="h-4 w-4 text-gold" /> <b>{num(sel.length, lang)}</b> {L('selected', 'নির্বাচিত')}
          <select value={bulk} onChange={(e) => setBulk(e.target.value)} className="rounded-full bg-cream/15 px-3 py-1.5 text-cream">
            <option value="" className="text-night">{L('Change status to…', 'স্ট্যাটাস বদলান…')}</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s} className="text-night">{lbl(s, lang)}</option>)}
          </select>
          <button disabled={!bulk || busy} onClick={applyBulk} className="btn-gold !min-h-9 !px-4">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Apply', 'প্রয়োগ')}</button>
          <button onClick={() => setSel([])} className="ml-auto text-xs underline">{L('Clear', 'বাতিল')}</button>
        </div>
      )}

      <DataTable
        rows={data?.items}
        cols={cols}
        loading={loading}
        rowKey={(o) => o._id}
        onRow={(o) => router.push(`/admin/orders/${o._id}`)}
        selectable={can('orders.update')}
        selected={sel}
        onSelect={setSel}
        sort={state.sort ?? 'createdAt:desc'}
        onSort={(s) => set({ sort: s })}
      />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
    </div>
  );
}

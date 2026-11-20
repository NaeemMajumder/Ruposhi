'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Ban, Loader2, ShieldCheck, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num } from '@/lib/format';
import { Sheet } from '../../ui/Sheet';
import { TableSk } from '../../ui/Skeletons';
import { toast } from '../../ui/Toast';
import { lbl } from '../labels';
import { useAdmin, useCan, useClientPage, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, DataTable, DateRange, ExportButton, F, FilterBar, FSelect, MultiSelect, PageHead, Pager, SearchBox, type Col } from '../ui';

type C = { _id: string; name: string; phone: string; email?: string; tags: string[]; blocked: boolean; loyaltyPoints: number; totalSpent: number; orderCount: number; createdAt: string; lastOrderAt?: string; notes?: string; addresses: { district: string }[] };
type Detail = { customer: C; orders: { _id: string; orderNo: string; status: string; total: number; createdAt: string }[]; fraud: { combinedSuccessRate: number | null; risk: string } };
const TAGS = ['vip', 'repeat', 'wholesale', 'bride', 'influencer', 'risky'];

export function Customers() {
  const { lang } = useT();
  const L = useL();
  const { state, set, qs } = useUrlState();
  const { data, loading, reload } = useAdmin<Paged<C>>(`/admin/customers?${qs({ limit: PAGE_SIZE })}`);
  const [open, setOpen] = useState<string | null>(null);
  const m = (n: number) => money(n, lang);
  const cols: Col<C>[] = [
    { key: 'n', head: L('Customer', 'কাস্টমার'), sort: 'name', cell: (c) => (<div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/20 text-xs font-bold text-bronze">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span><div><p className="font-medium">{c.name} {c.blocked && <Ban className="inline h-3.5 w-3.5 text-danger" />}</p><p className="text-[11px] text-mocha">{c.phone}</p></div></div>) },
    { key: 'o', head: L('Orders', 'অর্ডার'), sort: 'orderCount', cell: (c) => <span className="tabular-nums">{num(c.orderCount, lang)}</span> },
    { key: 's', head: L('Spent', 'খরচ'), sort: 'totalSpent', cell: (c) => <span className="font-semibold tabular-nums">{m(c.totalSpent)}</span> },
    { key: 't', head: L('Tags', 'ট্যাগ'), hideSm: true, cell: (c) => <div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} v={t === 'risky' ? 'high' : t === 'vip' ? 'paid' : 'draft'} label={t} />)}</div> },
    { key: 'l', head: L('Last order', 'শেষ অর্ডার'), hideSm: true, cell: (c) => <span className="text-xs text-mocha">{c.lastOrderAt ? dateFmt(c.lastOrderAt, lang) : '—'}</span> },
    { key: 'j', head: L('Joined', 'যোগদান'), sort: 'createdAt', hideSm: true, cell: (c) => <span className="text-xs text-mocha">{dateFmt(c.createdAt, lang)}</span> },
  ];
  return (
    <div>
      <PageHead title={L('Customers', 'কাস্টমার')} sub={data ? `${num(data.total, lang)} ${L('customers', 'জন কাস্টমার')}` : undefined} actions={<ExportButton path={`/admin/customers/export?${qs()}`} />} />
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Name, phone, email…', 'নাম, ফোন, ইমেইল…')} />
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <MultiSelect label={L('Tags', 'ট্যাগ')} value={state.tag ?? ''} onChange={(v) => set({ tag: v || undefined })} options={TAGS.map((t) => ({ value: t, label: t }))} />
        <FSelect label={L('Orders', 'অর্ডার')} value={state.minOrders ?? ''} onChange={(v) => set({ minOrders: v || undefined })} options={[{ value: '1', label: '1+' }, { value: '2', label: L('2+ (repeat)', '২+ (রিপিট)') }, { value: '5', label: '5+' }]} />
        <FSelect label={L('Spent', 'খরচ')} value={state.minSpent ?? ''} onChange={(v) => set({ minSpent: v || undefined })} options={[{ value: '5000', label: '৳5k+' }, { value: '20000', label: '৳20k+' }, { value: '50000', label: '৳50k+ (VIP)' }]} />
        <FSelect label={L('Blocked', 'ব্লকড')} value={state.blocked ?? ''} onChange={(v) => set({ blocked: v || undefined })} options={[{ value: 'true', label: L('Blocked only', 'শুধু ব্লকড') }, { value: 'false', label: L('Active only', 'শুধু সক্রিয়') }]} />
      </FilterBar>
      <DataTable rows={data?.items} cols={cols} loading={loading} rowKey={(c) => c._id} onRow={(c) => setOpen(c._id)} sort={state.sort ?? 'createdAt:desc'} onSort={(s) => set({ sort: s })} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)} title={L('Customer', 'কাস্টমার')}>
        {open && <CustomerDetail id={open} onSaved={reload} />}
      </Sheet>
    </div>
  );
}

function CustomerDetail({ id, onSaved }: { id: string; onSaved: () => void }) {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const { data, reload } = useAdmin<Detail>(`/admin/customers/${id}`);
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ordersPg = useClientPage(data?.orders);
  if (!data) return <div className="p-5"><TableSk rows={4} /></div>;
  const c = data.customer;
  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try { await apiFetch(`/admin/customers/${id}`, { admin: true, method: 'PATCH', body }); toast.success(L('Saved', 'সেভ হয়েছে')); reload(); onSaved(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5 p-5">
      <div>
        <p className="font-display text-3xl">{c.name}</p>
        <p className="text-sm text-mocha">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
        <p className="mt-1 text-xs text-mocha">{L('Joined', 'যোগদান')} {dateFmt(c.createdAt, lang)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[[num(c.orderCount, lang), L('orders', 'অর্ডার')], [money(c.totalSpent, lang), L('spent', 'খরচ')], [data.fraud.combinedSuccessRate != null ? `${data.fraud.combinedSuccessRate}%` : '—', L('success', 'সফলতা')]].map(([v, l]) => <div key={l} className="rounded-2xl bg-sand p-3"><p className="font-display text-xl">{v}</p><p className="text-[11px] text-mocha">{l}</p></div>)}
      </div>
      {can('customers.edit') && (
        <>
          <div>
            <span className="label">{L('Tags', 'ট্যাগ')}</span>
            <div className="flex flex-wrap gap-1.5">{TAGS.map((t) => <button key={t} disabled={busy} onClick={() => patch({ tags: c.tags.includes(t) ? c.tags.filter((x) => x !== t) : [...c.tags, t] })} className={cn('chip !min-h-8 !text-xs', c.tags.includes(t) && 'chip-on')}>{t}</button>)}</div>
          </div>
          <F label={L('Internal notes', 'ইন্টারনাল নোট')}><textarea rows={3} value={notes ?? c.notes ?? ''} onChange={(e) => setNotes(e.target.value)} maxLength={1000} className="field text-sm" /></F>
          <div className="flex gap-2">
            <button disabled={busy || notes == null} onClick={() => patch({ notes: notes ?? '' })} className="btn-primary !min-h-10 flex-1">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Save notes', 'নোট সেভ')}</button>
            <button disabled={busy} onClick={() => patch({ blocked: !c.blocked })} className={cn('btn-ghost !min-h-10', !c.blocked && 'hover:!border-danger hover:!bg-danger hover:!text-ivory')}>{c.blocked ? <><ShieldCheck className="h-4 w-4" />{L('Unblock', 'আনব্লক')}</> : <><Ban className="h-4 w-4" />{L('Block COD', 'ব্লক')}</>}</button>
          </div>
        </>
      )}
      <div>
        <span className="label">{L('Order history', 'অর্ডারের ইতিহাস')}</span>
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {data.orders.length === 0 && <li className="p-4 text-sm text-mocha">—</li>}
          {ordersPg.rows!.map((o) => (
            <li key={o._id}><Link href={`/admin/orders/${o._id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-blush"><span><span className="font-mono text-xs font-semibold">{o.orderNo}</span><span className="block text-[11px] text-mocha">{dateFmt(o.createdAt, lang)}</span></span><Badge v={o.status} label={lbl(o.status, lang)} /><span className="tabular-nums">{money(o.total, lang)}</span></Link></li>
          ))}
        </ul>
        {data.orders.length > 0 && <Pager {...ordersPg.pager} />}
      </div>
      <button onClick={() => window.open(`https://wa.me/88${c.phone}`, '_blank')} className="btn-ghost w-full">WhatsApp <X className="hidden" /></button>
    </div>
  );
}

'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Boxes, Loader2, PackageX, TriangleAlert, Wallet } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num } from '@/lib/format';
import { Modal } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';
import { lbl } from '../labels';
import { useAdmin, useCan, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, DataTable, DateRange, ExportButton, F, FilterBar, Kpi, MultiSelect, PageHead, Pager, SearchBox, Tabs, type Col } from '../ui';

type Row = { productId: string; slug: string; name: string; image: string; category: string; sku: string; color: string; size: string; stock: number; value: number; status: string; preOrder: boolean };
type Log = { _id: string; sku: string; productSlug: string; change: number; before: number; after: number; reason: string; ref?: string; actor: string; createdAt: string };
const REASONS = ['restock', 'damaged', 'lost', 'correction', 'return', 'transfer'];

export function Inventory() {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const { state, set, qs } = useUrlState();
  const view = state.view ?? 'stock';
  const stock = useAdmin<Paged<Row> & { summary: { skus: number; units: number; stockValue: number; low: number; out: number } }>(view === 'stock' ? `/admin/inventory?${qs({ limit: PAGE_SIZE })}` : null);
  const logs = useAdmin<Paged<Log>>(view === 'logs' ? `/admin/inventory/logs?${qs({ limit: PAGE_SIZE })}` : null);
  const [adj, setAdj] = useState<Row | null>(null);
  const s = stock.data?.summary;

  const cols: Col<Row>[] = [
    { key: 'p', head: L('Variant', 'ভ্যারিয়েন্ট'), cell: (r) => (<div className="flex items-center gap-3"><span className="media relative h-11 w-9 shrink-0 overflow-hidden rounded-lg"><Image src={r.image} alt="" fill sizes="36px" className="object-cover" /></span><div className="min-w-0"><p className="line-clamp-1 font-medium">{r.name}</p><p className="font-mono text-[11px] text-mocha">{r.sku} · {r.color} · {r.size}</p></div></div>) },
    { key: 'cat', head: L('Category', 'ক্যাটাগরি'), hideSm: true, cell: (r) => <span className="text-mocha">{lbl(r.category, lang)}</span> },
    { key: 'stock', head: L('Stock', 'স্টক'), cell: (r) => <span className={cn('font-semibold tabular-nums', r.stock === 0 && 'text-danger')}>{num(r.stock, lang)}</span> },
    { key: 'st', head: L('Status', 'অবস্থা'), cell: (r) => <Badge v={r.status === 'out' ? 'out' : r.status === 'low' ? 'medium' : 'in'} label={r.status === 'out' ? L('Out', 'শেষ') : r.status === 'low' ? L('Low', 'কম') : L('OK', 'ঠিক আছে')} /> },
    { key: 'val', head: L('Stock value', 'স্টক মূল্য'), hideSm: true, className: 'text-right', cell: (r) => <span className="tabular-nums text-mocha">{money(r.value, lang)}</span> },
    { key: 'a', head: '', className: 'text-right', cell: (r) => can('inventory.edit') && <button onClick={(e) => (e.stopPropagation(), setAdj(r))} className="chip !min-h-8 !text-xs">{L('Adjust', 'সমন্বয়')}</button> },
  ];
  const logCols: Col<Log>[] = [
    { key: 'd', head: L('When', 'কখন'), cell: (l) => <span className="text-xs">{dateFmt(l.createdAt, lang, true)}</span> },
    { key: 'sku', head: 'SKU', cell: (l) => <span className="font-mono text-xs">{l.sku}</span> },
    { key: 'c', head: L('Change', 'পরিবর্তন'), cell: (l) => <span className={cn('font-semibold tabular-nums', l.change > 0 ? 'text-success' : 'text-danger')}>{l.change > 0 ? '+' : ''}{num(l.change, lang)}</span> },
    { key: 'ba', head: L('Before → after', 'আগে → পরে'), hideSm: true, cell: (l) => <span className="tabular-nums text-mocha">{num(l.before, lang)} → {num(l.after, lang)}</span> },
    { key: 'r', head: L('Reason', 'কারণ'), cell: (l) => <Badge v={l.reason} /> },
    { key: 'ref', head: L('Ref / by', 'রেফ / কে'), hideSm: true, cell: (l) => <span className="text-xs text-mocha">{l.ref ? `${l.ref} · ` : ''}{l.actor}</span> },
  ];

  return (
    <div>
      <PageHead title={L('Inventory', 'ইনভেন্টরি')} actions={<ExportButton path={view === 'stock' ? `/admin/inventory/export?${qs()}` : `/admin/inventory/logs/export?${qs()}`} />} />
      <Tabs tabs={[{ id: 'stock', label: L('Stock levels', 'স্টক লেভেল') }, { id: 'logs', label: L('Movement log', 'মুভমেন্ট লগ') }]} value={view} onChange={(v) => set({ view: v === 'stock' ? undefined : v, q: undefined, stock: undefined, reason: undefined, from: undefined, to: undefined })} />
      {view === 'stock' ? (
        <>
          <div className="stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label={L('SKUs', 'SKU')} value={s?.skus ?? 0} loading={!s} format={(n) => num(Math.round(n), lang)} icon={Boxes} hint={`${num(s?.units ?? 0, lang)} ${L('units', 'পিস')}`} />
            <Kpi label={L('Stock value (cost)', 'স্টক মূল্য (খরচে)')} value={s?.stockValue ?? 0} loading={!s} format={(n) => money(Math.round(n), lang)} icon={Wallet} />
            <Kpi label={L('Low stock', 'স্টক কম')} value={s?.low ?? 0} loading={!s} format={(n) => num(Math.round(n), lang)} icon={TriangleAlert} />
            <Kpi label={L('Out of stock', 'স্টক শেষ')} value={s?.out ?? 0} loading={!s} format={(n) => num(Math.round(n), lang)} icon={PackageX} />
          </div>
          <FilterBar>
            <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Name or SKU…', 'নাম বা SKU…')} />
            <MultiSelect label={L('Category', 'ক্যাটাগরি')} value={state.category ?? ''} onChange={(v) => set({ category: v || undefined })} options={['saree', 'panjabi', 'salwar-kameez', 'kurti'].map((c) => ({ value: c, label: lbl(c, lang) }))} />
            <MultiSelect label={L('Stock', 'স্টক')} value={state.stock ?? ''} onChange={(v) => set({ stock: v || undefined })} options={[{ value: 'ok', label: L('OK', 'ঠিক') }, { value: 'low', label: L('Low', 'কম') }, { value: 'out', label: L('Out', 'শেষ') }]} />
          </FilterBar>
          <DataTable rows={stock.data?.items} cols={cols} loading={stock.loading} rowKey={(r) => r.sku} />
          {stock.data && <Pager page={stock.data.page} pages={stock.data.pages} total={stock.data.total} onPage={(p) => set({ page: String(p) }, false)} />}
        </>
      ) : (
        <>
          <FilterBar>
            <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder="SKU…" />
            <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
            <MultiSelect label={L('Reason', 'কারণ')} value={state.reason ?? ''} onChange={(v) => set({ reason: v || undefined })} options={[...REASONS, 'order', 'cancel'].map((r) => ({ value: r, label: r }))} />
          </FilterBar>
          <DataTable rows={logs.data?.items} cols={logCols} loading={logs.loading} rowKey={(l) => l._id} />
          {logs.data && <Pager page={logs.data.page} pages={logs.data.pages} total={logs.data.total} onPage={(p) => set({ page: String(p) }, false)} />}
        </>
      )}
      <Modal open={!!adj} onOpenChange={(v) => !v && setAdj(null)} title={L('Adjust stock', 'স্টক সমন্বয়')}>
        {adj && <Adjust r={adj} onDone={() => (setAdj(null), stock.reload())} />}
      </Modal>
    </div>
  );
}

function Adjust({ r, onDone }: { r: Row; onDone: () => void }) {
  const { lang } = useT();
  const L = useL();
  const [change, setChange] = useState(1);
  const [reason, setReason] = useState('restock');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        await apiFetch('/admin/inventory/adjust', { admin: true, body: { slug: r.slug, sku: r.sku, change, reason, ref: ref || undefined } });
        toast.success(L('Stock updated', 'স্টক আপডেট হয়েছে'));
        onDone();
      } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Error'); } finally { setBusy(false); }
    }}>
      <p className="rounded-xl bg-sand p-3 text-sm"><b>{r.name}</b><br /><span className="font-mono text-xs">{r.sku}</span> · {L('now', 'এখন')} <b>{num(r.stock, lang)}</b> → <b className={cn(r.stock + change < 0 && 'text-danger')}>{num(r.stock + change, lang)}</b></p>
      <div className="grid grid-cols-2 gap-3">
        <F label={L('Change (+/−)', 'পরিবর্তন (+/−)')}><input type="number" value={change} onChange={(e) => setChange(Number(e.target.value))} className="field" /></F>
        <F label={L('Reason', 'কারণ')}><select value={reason} onChange={(e) => setReason(e.target.value)} className="field capitalize">{REASONS.map((x) => <option key={x}>{x}</option>)}</select></F>
      </div>
      <F label={L('Reference (PO / note)', 'রেফারেন্স (PO / নোট)')}><input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} className="field" /></F>
      <p className="text-xs text-mocha">{L('Restocking an out-of-stock SKU automatically SMS-es customers who asked to be notified.', 'স্টক শেষ SKU রিস্টক করলে যারা "আমাকে জানান" দিয়েছিল তাদের নিজে থেকে SMS যাবে।')}</p>
      <button disabled={busy || !change || r.stock + change < 0} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Save', 'সেভ')}</button>
    </form>
  );
}

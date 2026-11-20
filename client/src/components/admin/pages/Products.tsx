'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Copy, FileUp, Loader2, Percent, Plus, Star } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { money, num, tr } from '@/lib/format';
import type { Product } from '@/lib/types';
import { Modal } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';
import { lbl } from '../labels';
import { useAdmin, useCan, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, DataTable, ExportButton, F, FilterBar, FSelect, MultiSelect, PageHead, Pager, SearchBox, UploadButton, type Col } from '../ui';

type P = Product & { costPrice: number; status: string };
type ImportRes = { productsUpdated: number; stockChanges: number; skipped: number; errors: { row: number; error: string }[] };

export function Products() {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const router = useRouter();
  const { state, set, qs } = useUrlState();
  const { data, loading, reload } = useAdmin<Paged<P>>(`/admin/products?${qs({ limit: PAGE_SIZE })}`);
  const [imp, setImp] = useState<ImportRes | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const m = (n: number) => money(n, lang);
  const cats = ['saree', 'panjabi', 'salwar-kameez', 'kurti'];

  const cols: Col<P>[] = [
    {
      key: 'p', head: L('Product', 'প্রোডাক্ট'), sort: 'name',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <span className="media relative h-12 w-10 shrink-0 overflow-hidden rounded-lg">{p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />}</span>
          <div className="min-w-0"><p className="line-clamp-1 font-medium">{tr(p.name, lang)} {p.isFeatured && <Star className="inline h-3 w-3 fill-gold text-gold" />}</p><p className="font-mono text-[11px] text-mocha">{p.sku}</p></div>
        </div>
      ),
    },
    { key: 'cat', head: L('Category', 'ক্যাটাগরি'), hideSm: true, cell: (p) => <span className="text-mocha">{lbl(p.category, lang)}</span> },
    { key: 'price', head: L('Price', 'দাম'), sort: 'price', cell: (p) => (<div className="tabular-nums"><p className="font-semibold">{m(p.price)}</p>{p.compareAtPrice ? <p className="text-[11px] text-mocha line-through">{m(p.compareAtPrice)}</p> : null}</div>) },
    { key: 'margin', head: L('Margin', 'মার্জিন'), hideSm: true, cell: (p) => <span className="text-xs tabular-nums text-mocha">{p.price ? Math.round(((p.price - p.costPrice) / p.price) * 100) : 0}%</span> },
    { key: 'stock', head: L('Stock', 'স্টক'), sort: 'stock', cell: (p) => <Badge v={p.totalStock === 0 ? 'out' : p.lowStock ? 'medium' : 'in'} label={p.preOrder && p.totalStock === 0 ? L('Pre-order', 'প্রি-অর্ডার') : num(p.totalStock, lang)} /> },
    { key: 'sold', head: L('Sold', 'বিক্রি'), sort: 'sold', hideSm: true, cell: (p) => <span className="tabular-nums">{num(p.soldCount, lang)}</span> },
    { key: 'status', head: L('Status', 'স্ট্যাটাস'), cell: (p) => <Badge v={p.status} /> },
    {
      key: 'act', head: '', className: 'text-right', cell: (p) => can('products.edit') && (
        <button onClick={async (e) => { e.stopPropagation(); try { const c = await apiFetch<P>(`/admin/products/${p._id}/duplicate`, { admin: true, method: 'POST' }); toast.success(L('Duplicated as draft', 'ড্রাফট হিসেবে কপি হয়েছে')); router.push(`/admin/products/${c._id}`); } catch (er) { toast.error((er as Error).message); } }} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand" aria-label="Duplicate" title={L('Duplicate', 'কপি')}><Copy className="h-4 w-4" /></button>
      ),
    },
  ];

  return (
    <div>
      <PageHead
        title={L('Products', 'প্রোডাক্ট')}
        sub={data ? `${num(data.total, lang)} ${L('products', 'টি প্রোডাক্ট')}` : undefined}
        actions={<>
          <ExportButton path={`/admin/products/export?${qs()}`} />
          {can('products.price') && <UploadButton accept=".xlsx" label={L('Import Excel', 'এক্সেল ইমপোর্ট')} onFile={async (f) => {
            const fd = new FormData();
            fd.append('file', f);
            try { const r = await apiFetch<ImportRes>('/admin/products/import', { admin: true, body: fd }); setImp(r); reload(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Import failed'); }
          }} />}
          {can('products.price') && <button onClick={() => setBulkOpen(true)} className="btn-ghost !min-h-10 !px-4 text-sm"><Percent className="h-4 w-4" /> {L('Bulk price', 'বাল্ক প্রাইস')}</button>}
          {can('products.edit') && <Link href="/admin/products/new" className="btn-primary !min-h-10 !px-4 text-sm"><Plus className="h-4 w-4" /> {L('New product', 'নতুন প্রোডাক্ট')}</Link>}
        </>}
      />
      <p className="mb-4 flex items-start gap-2 rounded-2xl bg-sand px-4 py-3 text-xs text-mocha"><FileUp className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />{L('Editable Excel: export, change price / compare price / stock / status / featured in the sheet, then import it back. One row per variant (SKU). Every change is audited.', 'এডিটেবল এক্সেল: এক্সপোর্ট করুন, শিটে দাম / আগের দাম / স্টক / স্ট্যাটাস / ফিচার্ড বদলান, তারপর ইমপোর্ট করুন। প্রতি ভ্যারিয়েন্ট (SKU) এক সারি। সব পরিবর্তন অডিট হয়।')}</p>
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Name, SKU, fabric…', 'নাম, SKU, কাপড়…')} />
        <MultiSelect label={L('Category', 'ক্যাটাগরি')} value={state.category ?? ''} onChange={(v) => set({ category: v || undefined })} options={cats.map((c) => ({ value: c, label: lbl(c, lang) }))} />
        <MultiSelect label={L('Status', 'স্ট্যাটাস')} value={state.status ?? ''} onChange={(v) => set({ status: v || undefined })} options={['active', 'draft', 'archived'].map((v) => ({ value: v, label: v }))} />
        <FSelect label={L('Stock', 'স্টক')} value={state.stock ?? ''} onChange={(v) => set({ stock: v || undefined })} options={[{ value: 'in', label: L('In stock', 'স্টকে') }, { value: 'low', label: L('Low', 'কম') }, { value: 'out', label: L('Out', 'শেষ') }]} />
        <FSelect label={L('Featured', 'ফিচার্ড')} value={state.featured ?? ''} onChange={(v) => set({ featured: v || undefined })} options={[{ value: 'true', label: L('Featured', 'ফিচার্ড') }, { value: 'false', label: L('Not featured', 'ফিচার্ড নয়') }]} />
      </FilterBar>
      <DataTable rows={data?.items} cols={cols} loading={loading} rowKey={(p) => p._id} onRow={(p) => router.push(`/admin/products/${p._id}`)} selectable={can('products.price')} selected={sel} onSelect={setSel} sort={state.sort ?? 'createdAt:desc'} onSort={(s) => set({ sort: s })} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}

      <Modal open={!!imp} onOpenChange={(v) => !v && setImp(null)} title={L('Import result', 'ইমপোর্ট ফলাফল')}>
        {imp && (
          <div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[[imp.productsUpdated, L('products updated', 'প্রোডাক্ট আপডেট')], [imp.stockChanges, L('stock changes', 'স্টক পরিবর্তন')], [imp.skipped, L('unchanged', 'অপরিবর্তিত')]].map(([n, l]) => (
                <div key={String(l)} className="rounded-2xl bg-sand p-3"><p className="font-display text-3xl">{num(Number(n), lang)}</p><p className="text-[11px] text-mocha">{l}</p></div>
              ))}
            </div>
            {imp.errors.length > 0 && (
              <div className="mt-4 max-h-56 overflow-y-auto rounded-2xl border border-danger/30 p-3 text-sm">
                <p className="mb-2 font-semibold text-danger">{imp.errors.length} {L('rows had errors', 'সারিতে ভুল')}</p>
                {imp.errors.map((e) => <p key={e.row} className="text-xs"><b>{L('Row', 'সারি')} {e.row}:</b> {e.error}</p>)}
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal open={bulkOpen} onOpenChange={setBulkOpen} title={L('Bulk price change', 'বাল্ক প্রাইস পরিবর্তন')}>
        <BulkPrice ids={sel} onDone={() => (setBulkOpen(false), setSel([]), reload())} />
      </Modal>
    </div>
  );
}

function BulkPrice({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const { lang } = useT();
  const L = useL();
  const [scope, setScope] = useState(ids.length ? 'selected' : 'category');
  const [category, setCategory] = useState('saree');
  const [percent, setPercent] = useState(10);
  const [field, setField] = useState<'price' | 'compareAtPrice'>('price');
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        const r = await apiFetch<{ updated: number }>('/admin/products/bulk-price', { admin: true, body: { percent, field, ...(scope === 'selected' ? { productIds: ids } : { category }) } });
        toast.success(`${num(r.updated, lang)} ${L('products updated', 'প্রোডাক্ট আপডেট')}`);
        onDone();
      } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Error'); } finally { setBusy(false); }
    }}>
      <F label={L('Apply to', 'যেখানে প্রয়োগ')}>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="field">
          {ids.length > 0 && <option value="selected">{L(`Selected (${ids.length})`, `নির্বাচিত (${ids.length})`)}</option>}
          <option value="category">{L('A category', 'একটি ক্যাটাগরি')}</option>
        </select>
      </F>
      {scope === 'category' && <F label={L('Category', 'ক্যাটাগরি')}><select value={category} onChange={(e) => setCategory(e.target.value)} className="field">{['saree', 'panjabi', 'salwar-kameez', 'kurti'].map((c) => <option key={c} value={c}>{lbl(c, lang)}</option>)}</select></F>}
      <div className="grid grid-cols-2 gap-3">
        <F label={L('Change %', 'পরিবর্তন %')} hint={L('Negative = decrease', 'ঋণাত্মক = কমানো')}><input type="number" min={-90} max={90} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="field" /></F>
        <F label={L('Field', 'ফিল্ড')}><select value={field} onChange={(e) => setField(e.target.value as 'price')} className="field"><option value="price">{L('Price', 'দাম')}</option><option value="compareAtPrice">{L('Compare-at price', 'আগের দাম')}</option></select></F>
      </div>
      <p className="rounded-xl bg-sand p-3 text-xs text-mocha">{L('Prices are rounded to the nearest ৳10. Each change is written to the audit log.', 'দাম নিকটতম ৳১০-এ রাউন্ড হবে। প্রতিটি পরিবর্তন অডিট লগে লেখা হবে।')}</p>
      <button disabled={busy || !percent} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Apply', 'প্রয়োগ করুন')}</button>
    </form>
  );
}

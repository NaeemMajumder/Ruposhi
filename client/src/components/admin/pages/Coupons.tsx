'use client';
import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { dateFmt, money, num, tr } from '@/lib/format';
import type { I18n } from '@/lib/types';
import { Modal } from '../../ui/Sheet';
import { toast } from '../../ui/Toast';
import { lbl } from '../labels';
import { useAdmin, useClientPage, useL } from '../lib';
import { Badge, DataTable, ExportButton, F, PageHead, Pager, Toggle, type Col } from '../ui';

type Cp = { _id: string; code: string; type: 'percent' | 'flat' | 'free_shipping'; value: number; maxDiscount?: number; minOrder: number; firstOrderOnly: boolean; categories: string[]; usageLimit?: number; perCustomerLimit: number; usedCount: number; startsAt?: string; endsAt?: string; isActive: boolean; description: I18n };
const NEW: Partial<Cp> = { code: '', type: 'percent', value: 10, minOrder: 0, firstOrderOnly: false, categories: [], perCustomerLimit: 1, isActive: true, description: { en: '', bn: '' } };

export function Coupons() {
  const { lang } = useT();
  const L = useL();
  const { data, reload } = useAdmin<Cp[]>('/admin/coupons');
  const [edit, setEdit] = useState<Partial<Cp> | null>(null);
  const pg = useClientPage(data);
  const expired = (c: Cp) => !!c.endsAt && new Date(c.endsAt) < new Date();
  const cols: Col<Cp>[] = [
    { key: 'c', head: L('Code', 'কোড'), cell: (c) => (<div><p className="font-mono font-semibold tracking-wider">{c.code}</p><p className="text-[11px] text-mocha">{tr(c.description, lang)}</p></div>) },
    { key: 'v', head: L('Offer', 'অফার'), cell: (c) => <span className="font-semibold">{c.type === 'percent' ? `${c.value}%` : c.type === 'flat' ? money(c.value, lang) : L('Free delivery', 'ফ্রি ডেলিভারি')}</span> },
    { key: 'r', head: L('Rules', 'শর্ত'), hideSm: true, cell: (c) => <span className="text-xs text-mocha">{L('min', 'ন্যূনতম')} {money(c.minOrder, lang)}{c.maxDiscount ? ` · ${L('max', 'সর্বোচ্চ')} ${money(c.maxDiscount, lang)}` : ''}{c.firstOrderOnly ? ` · ${L('first order', 'প্রথম অর্ডার')}` : ''}{c.categories.length ? ` · ${c.categories.map((x) => lbl(x, lang)).join(', ')}` : ''}</span> },
    { key: 'u', head: L('Used', 'ব্যবহার'), cell: (c) => <span className="tabular-nums">{num(c.usedCount, lang)}{c.usageLimit ? ` / ${num(c.usageLimit, lang)}` : ''}</span> },
    { key: 'e', head: L('Valid till', 'মেয়াদ'), hideSm: true, cell: (c) => <span className="text-xs">{c.endsAt ? dateFmt(c.endsAt, lang) : '∞'}</span> },
    { key: 's', head: L('Status', 'স্ট্যাটাস'), cell: (c) => <Badge v={expired(c) ? 'failed' : c.isActive ? 'active' : 'draft'} label={expired(c) ? L('Expired', 'মেয়াদোত্তীর্ণ') : c.isActive ? L('Active', 'সক্রিয়') : L('Paused', 'বন্ধ')} /> },
  ];
  return (
    <div>
      <PageHead title={L('Coupons', 'কুপন')} actions={<><ExportButton path="/admin/coupons/export" /><button onClick={() => setEdit({ ...NEW })} className="btn-primary !min-h-10 text-sm"><Plus className="h-4 w-4" /> {L('New coupon', 'নতুন কুপন')}</button></>} />
      <DataTable rows={pg.rows} cols={cols} rowKey={(c) => c._id} onRow={(c) => setEdit(c)} />
      {data && <Pager {...pg.pager} />}
      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?._id ? edit.code ?? '' : L('New coupon', 'নতুন কুপন')} wide>
        {edit && <CouponForm c={edit} onDone={() => (setEdit(null), reload())} />}
      </Modal>
    </div>
  );
}

function CouponForm({ c, onDone }: { c: Partial<Cp>; onDone: () => void }) {
  const { lang } = useT();
  const L = useL();
  const [f, setF] = useState(c as Cp);
  const [busy, setBusy] = useState(false);
  const d = (s?: string) => (s ? s.slice(0, 10) : '');
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        const body = { code: f.code.toUpperCase(), type: f.type, value: f.value, maxDiscount: f.maxDiscount || undefined, minOrder: f.minOrder, firstOrderOnly: f.firstOrderOnly, categories: f.categories, usageLimit: f.usageLimit || undefined, perCustomerLimit: f.perCustomerLimit, startsAt: f.startsAt || undefined, endsAt: f.endsAt || undefined, isActive: f.isActive, description: f.description };
        await apiFetch(f._id ? `/admin/coupons/${f._id}` : '/admin/coupons', { admin: true, method: f._id ? 'PATCH' : 'POST', body });
        toast.success(L('Saved', 'সেভ হয়েছে'));
        onDone();
      } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Error'); } finally { setBusy(false); }
    }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <F label={L('Code', 'কোড')}><input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, '') })} maxLength={20} className="field font-mono uppercase tracking-wider" /></F>
        <F label={L('Type', 'ধরন')}><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as Cp['type'] })} className="field"><option value="percent">%</option><option value="flat">৳ {L('flat', 'নির্দিষ্ট')}</option><option value="free_shipping">{L('Free delivery', 'ফ্রি ডেলিভারি')}</option></select></F>
        {f.type !== 'free_shipping' && <F label={L('Value', 'মান')}><input type="number" min={0} value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })} className="field" /></F>}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <F label={L('Min order ৳', 'ন্যূনতম ৳')}><input type="number" min={0} value={f.minOrder} onChange={(e) => setF({ ...f, minOrder: Number(e.target.value) })} className="field" /></F>
        <F label={L('Max discount ৳', 'সর্বোচ্চ ছাড় ৳')}><input type="number" min={0} value={f.maxDiscount ?? ''} onChange={(e) => setF({ ...f, maxDiscount: Number(e.target.value) || undefined })} className="field" /></F>
        <F label={L('Total uses', 'মোট ব্যবহার')}><input type="number" min={1} value={f.usageLimit ?? ''} onChange={(e) => setF({ ...f, usageLimit: Number(e.target.value) || undefined })} placeholder="∞" className="field" /></F>
        <F label={L('Per customer', 'প্রতি কাস্টমার')}><input type="number" min={1} value={f.perCustomerLimit} onChange={(e) => setF({ ...f, perCustomerLimit: Number(e.target.value) })} className="field" /></F>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label={L('Starts', 'শুরু')}><input type="date" value={d(f.startsAt)} onChange={(e) => setF({ ...f, startsAt: e.target.value })} className="field" /></F>
        <F label={L('Ends', 'শেষ')}><input type="date" value={d(f.endsAt)} onChange={(e) => setF({ ...f, endsAt: e.target.value })} className="field" /></F>
        <F label="Description (EN)"><input value={f.description.en} onChange={(e) => setF({ ...f, description: { ...f.description, en: e.target.value } })} className="field" /></F>
        <F label="বিবরণ (BN)"><input value={f.description.bn} onChange={(e) => setF({ ...f, description: { ...f.description, bn: e.target.value } })} className="field" /></F>
      </div>
      <span className="label">{L('Only for categories (optional)', 'শুধু এই ক্যাটাগরিতে (ঐচ্ছিক)')}</span>
      <div className="flex flex-wrap gap-1.5">{['saree', 'panjabi', 'salwar-kameez', 'kurti'].map((x) => <button type="button" key={x} onClick={() => setF({ ...f, categories: f.categories.includes(x) ? f.categories.filter((y) => y !== x) : [...f.categories, x] })} className={`chip !min-h-8 !text-xs ${f.categories.includes(x) ? 'chip-on' : ''}`}>{lbl(x, lang)}</button>)}</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle label={L('First order only', 'শুধু প্রথম অর্ডার')} checked={f.firstOrderOnly} onChange={(v) => setF({ ...f, firstOrderOnly: v })} />
        <Toggle label={L('Active', 'সক্রিয়')} checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      </div>
      <div className="flex gap-2 pt-2">
        <button disabled={busy} className="btn-primary h-12 flex-1">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Save coupon', 'কুপন সেভ')}</button>
        {f._id && <button type="button" onClick={async () => { if (!confirm(L('Delete coupon?', 'কুপন মুছবেন?'))) return; await apiFetch(`/admin/coupons/${f._id}`, { admin: true, method: 'DELETE' }).catch((e) => toast.error(e.message)); onDone(); }} className="btn-ghost h-12 hover:!border-danger hover:!bg-danger hover:!text-ivory"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </form>
  );
}

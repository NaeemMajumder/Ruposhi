'use client';
import { useState } from 'react';
import { Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, tr } from '@/lib/format';
import type { I18n, Product } from '@/lib/types';
import { Countdown } from '../../ui/Countdown';
import { Modal } from '../../ui/Sheet';
import { Sk } from '../../ui/Skeletons';
import { toast } from '../../ui/Toast';
import { useAdmin, useClientPage, useL } from '../lib';
import type { Paged } from '../types';
import { Badge, F, PageHead, Pager, Toggle } from '../ui';

type Fs = { _id: string; title: I18n; productSlugs: string[]; discountPercent: number; startsAt: string; endsAt: string; isActive: boolean };

export function FlashSales() {
  const { lang } = useT();
  const L = useL();
  const { data, reload } = useAdmin<Fs[]>('/admin/flash-sales');
  const [edit, setEdit] = useState<Partial<Fs> | null>(null);
  const pg = useClientPage(data);
  const live = (s: Fs) => s.isActive && new Date(s.startsAt) <= new Date() && new Date(s.endsAt) > new Date();
  return (
    <div>
      <PageHead title={L('Flash sales', 'ফ্ল্যাশ সেল')} sub={L('Only one sale is live at a time; its discount applies to the selected products on the store and at checkout.', 'একসময়ে একটিই সেল চলে; নির্বাচিত প্রোডাক্টে স্টোর ও চেকআউটে ছাড় প্রযোজ্য।')} actions={<button onClick={() => setEdit({ title: { en: '', bn: '' }, productSlugs: [], discountPercent: 15, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3 * 864e5).toISOString(), isActive: true })} className="btn-primary !min-h-10 text-sm"><Plus className="h-4 w-4" /> {L('New sale', 'নতুন সেল')}</button>} />
      <div className="stagger grid gap-4 lg:grid-cols-2">
        {!data ? <Sk className="h-48 !rounded-2xl" /> : pg.rows!.map((s) => (
          <button key={s._id} onClick={() => setEdit(s)} className={cn('card lift p-5 text-left', live(s) && 'border-gold')}>
            <div className="flex items-center justify-between"><p className="flex items-center gap-2 font-display text-2xl"><Zap className={cn('h-5 w-5', live(s) ? 'animate-pulse fill-gold text-gold' : 'text-mocha')} />{tr(s.title, lang)}</p><Badge v={live(s) ? 'active' : 'draft'} label={live(s) ? L('Live', 'চলছে') : s.isActive ? L('Scheduled / ended', 'নির্ধারিত / শেষ') : L('Off', 'বন্ধ')} /></div>
            <p className="mt-2 text-sm text-mocha">−{s.discountPercent}% · {s.productSlugs.length} {L('products', 'প্রোডাক্ট')} · {dateFmt(s.startsAt, lang)} → {dateFmt(s.endsAt, lang)}</p>
            {live(s) && <div className="mt-4"><Countdown endsAt={s.endsAt} tone="light" /></div>}
          </button>
        ))}
      </div>
      {data && <Pager {...pg.pager} />}
      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={L('Flash sale', 'ফ্ল্যাশ সেল')} wide>{edit && <FsForm s={edit} onDone={() => (setEdit(null), reload())} />}</Modal>
    </div>
  );
}

function FsForm({ s, onDone }: { s: Partial<Fs>; onDone: () => void }) {
  const { lang } = useT();
  const L = useL();
  const [f, setF] = useState(s as Fs);
  const [busy, setBusy] = useState(false);
  const { data: prods } = useAdmin<Paged<Product>>('/admin/products?limit=200&status=active');
  const dt = (x: string) => x.slice(0, 16);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        const body = { title: f.title, productSlugs: f.productSlugs, discountPercent: f.discountPercent, startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString(), isActive: f.isActive };
        await apiFetch(f._id ? `/admin/flash-sales/${f._id}` : '/admin/flash-sales', { admin: true, method: f._id ? 'PATCH' : 'POST', body });
        toast.success(L('Saved', 'সেভ হয়েছে'));
        onDone();
      } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Error'); } finally { setBusy(false); }
    }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Title (EN)"><input required value={f.title.en} onChange={(e) => setF({ ...f, title: { ...f.title, en: e.target.value } })} className="field" /></F>
        <F label="শিরোনাম (BN)"><input required value={f.title.bn} onChange={(e) => setF({ ...f, title: { ...f.title, bn: e.target.value } })} className="field" /></F>
        <F label={L('Starts', 'শুরু')}><input type="datetime-local" value={dt(f.startsAt)} onChange={(e) => setF({ ...f, startsAt: e.target.value })} className="field" /></F>
        <F label={L('Ends', 'শেষ')}><input type="datetime-local" value={dt(f.endsAt)} onChange={(e) => setF({ ...f, endsAt: e.target.value })} className="field" /></F>
        <F label={L('Discount %', 'ছাড় %')}><input type="number" min={1} max={90} value={f.discountPercent} onChange={(e) => setF({ ...f, discountPercent: Number(e.target.value) })} className="field" /></F>
        <div className="pt-6"><Toggle label={L('Active', 'সক্রিয়')} checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} /></div>
      </div>
      <span className="label">{L('Products', 'প্রোডাক্ট')} ({f.productSlugs.length})</span>
      <div className="grid max-h-60 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
        {prods?.items.map((p) => (
          <label key={p.slug} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand">
            <input type="checkbox" checked={f.productSlugs.includes(p.slug)} onChange={() => setF({ ...f, productSlugs: f.productSlugs.includes(p.slug) ? f.productSlugs.filter((x) => x !== p.slug) : [...f.productSlugs, p.slug] })} className="h-4 w-4 accent-[var(--color-espresso)]" />
            <span className="truncate">{tr(p.name, lang)}</span>
          </label>
        )) ?? <Sk className="h-20" />}
      </div>
      <div className="flex gap-2 pt-2">
        <button disabled={busy || !f.productSlugs.length} className="btn-primary h-12 flex-1">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Save sale', 'সেল সেভ')}</button>
        {f._id && <button type="button" onClick={async () => { if (!confirm(L('Delete?', 'মুছবেন?'))) return; await apiFetch(`/admin/flash-sales/${f._id}`, { admin: true, method: 'DELETE' }).catch((e) => toast.error(e.message)); onDone(); }} className="btn-ghost h-12"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </form>
  );
}

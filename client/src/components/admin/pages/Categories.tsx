'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { num, tr } from '@/lib/format';
import type { I18n } from '@/lib/types';
import { Modal } from '../../ui/Sheet';
import { Sk } from '../../ui/Skeletons';
import { toast } from '../../ui/Toast';
import { ImageUpload } from '../ImageUpload';
import { useAdmin, useCan, useClientPage, useL } from '../lib';
import { Badge, F, PageHead, Pager, Toggle } from '../ui';

type Cat = { _id: string; slug: string; name: I18n; description: I18n; image: string; sortOrder: number; isActive: boolean };

export function Categories() {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const { data, reload } = useAdmin<Cat[]>('/admin/categories');
  const [edit, setEdit] = useState<Partial<Cat> | null>(null);
  const pg = useClientPage(data ? [...data].sort((a, b) => a.sortOrder - b.sortOrder) : data);
  return (
    <div>
      <PageHead title={L('Categories', 'ক্যাটাগরি')} actions={can('products.edit') && <button onClick={() => setEdit({ name: { en: '', bn: '' }, description: { en: '', bn: '' }, image: '', sortOrder: (data?.length ?? 0) + 1, isActive: true, slug: '' })} className="btn-primary !min-h-10 text-sm"><Plus className="h-4 w-4" /> {L('New category', 'নতুন ক্যাটাগরি')}</button>} />
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data ? [1, 2, 3, 4].map((k) => <Sk key={k} className="h-72 !rounded-2xl" />) : pg.rows!.map((c) => (
          <div key={c._id} className="card lift group overflow-hidden">
            <div className="media relative aspect-[4/3] overflow-hidden"><Image src={c.image} alt="" fill sizes="(max-width:640px) 100vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" /></div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2"><p className="font-display text-2xl">{tr(c.name, lang)}</p><Badge v={c.isActive ? 'active' : 'draft'} label={c.isActive ? L('Active', 'সক্রিয়') : L('Hidden', 'লুকানো')} /></div>
              <p className="mt-1 line-clamp-2 text-sm text-mocha">{tr(c.description, lang)}</p>
              <p className="mt-2 font-mono text-[11px] text-mocha">/{c.slug} · #{num(c.sortOrder, lang)}</p>
              {can('products.edit') && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setEdit(c)} className="chip !min-h-8 !text-xs"><Pencil className="h-3 w-3" /> {L('Edit', 'এডিট')}</button>
                  {can('products.delete') && <button onClick={async () => { if (!confirm(L('Delete this category?', 'ক্যাটাগরি মুছবেন?'))) return; try { await apiFetch(`/admin/categories/${c._id}`, { admin: true, method: 'DELETE' }); reload(); } catch (e) { toast.error((e as Error).message); } }} className="chip !min-h-8 !text-xs hover:!border-danger hover:text-danger"><Trash2 className="h-3 w-3" /></button>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {data && <Pager {...pg.pager} />}
      <Modal open={!!edit} onOpenChange={(v) => !v && setEdit(null)} title={edit?._id ? L('Edit category', 'ক্যাটাগরি এডিট') : L('New category', 'নতুন ক্যাটাগরি')}>
        {edit && <CatForm c={edit} onDone={() => (setEdit(null), reload())} />}
      </Modal>
    </div>
  );
}

function CatForm({ c, onDone }: { c: Partial<Cat>; onDone: () => void }) {
  const L = useL();
  const [f, setF] = useState(c as Cat);
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        const { _id, ...body } = f;
        await apiFetch(_id ? `/admin/categories/${_id}` : '/admin/categories', { admin: true, method: _id ? 'PATCH' : 'POST', body: { slug: body.slug ?? '', name: body.name, description: body.description, image: body.image, sortOrder: body.sortOrder, isActive: body.isActive } });
        toast.success(L('Saved', 'সেভ হয়েছে'));
        onDone();
      } catch (er) { toast.error(er instanceof ApiError ? er.message : 'Error'); } finally { setBusy(false); }
    }}>
      <div className="grid grid-cols-2 gap-3">
        <F label="Name (EN)"><input required value={f.name.en} onChange={(e) => setF({ ...f, name: { ...f.name, en: e.target.value } })} className="field" /></F>
        <F label="নাম (BN)"><input required value={f.name.bn} onChange={(e) => setF({ ...f, name: { ...f.name, bn: e.target.value } })} className="field" /></F>
      </div>
      <F label="Description (EN)"><textarea rows={2} value={f.description.en} onChange={(e) => setF({ ...f, description: { ...f.description, en: e.target.value } })} className="field" /></F>
      <F label="বিবরণ (BN)"><textarea rows={2} value={f.description.bn} onChange={(e) => setF({ ...f, description: { ...f.description, bn: e.target.value } })} className="field" /></F>
      <F label={L('Image', 'ছবি')}>
        {f.image && <span className="media relative mb-2 block aspect-[4/3] w-40 overflow-hidden rounded-xl"><Image src={f.image} alt="" fill sizes="160px" unoptimized className="object-cover" /></span>}
        <input required type="url" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} placeholder="https://…" className="field" />
        <ImageUpload kind="categories" compact onUploaded={([url]) => setF((s) => ({ ...s, image: url }))} />
      </F>
      <div className="grid grid-cols-2 gap-3">
        <F label="Slug"><input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="field font-mono text-sm" /></F>
        <F label={L('Sort order', 'ক্রম')}><input type="number" min={0} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} className="field" /></F>
      </div>
      <Toggle label={L('Visible on store', 'স্টোরে দৃশ্যমান')} checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} />
      <button disabled={busy} className="btn-primary h-12 w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{L('Save', 'সেভ')}</button>
    </form>
  );
}

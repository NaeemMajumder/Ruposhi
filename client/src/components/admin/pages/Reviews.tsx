'use client';
import { useState } from 'react';
import { BadgeCheck, Check, EyeOff, Loader2, Reply, Trash2 } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, num } from '@/lib/format';
import { Stars } from '../../ui/Price';
import { TableSk } from '../../ui/Skeletons';
import { toast } from '../../ui/Toast';
import { useAdmin, useCan, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, FilterBar, FSelect, PageHead, Pager, SearchBox, Tabs } from '../ui';

type R = { _id: string; productSlug: string; customerName: string; rating: number; title: string; body: string; verified: boolean; status: string; reply?: string; createdAt: string };

export function Reviews() {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const { state, set, qs } = useUrlState();
  const { data, reload } = useAdmin<Paged<R>>(`/admin/reviews?${qs({ limit: PAGE_SIZE })}`);
  const [replying, setReplying] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const mod = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try { await apiFetch(`/admin/reviews/${id}`, { admin: true, method: 'PATCH', body }); reload(); toast.success(L('Updated', 'আপডেট হয়েছে')); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); } finally { setBusy(null); }
  };
  return (
    <div>
      <PageHead title={L('Reviews', 'রিভিউ')} sub={L('New reviews wait for approval. Approved reviews update the product rating instantly.', 'নতুন রিভিউ অনুমোদনের অপেক্ষায় থাকে। অনুমোদিত রিভিউ সাথে সাথে রেটিং আপডেট করে।')} />
      <Tabs tabs={[{ id: '', label: L('All', 'সব') }, { id: 'pending', label: L('Pending', 'পেন্ডিং') }, { id: 'approved', label: L('Approved', 'অনুমোদিত') }, { id: 'hidden', label: L('Hidden', 'লুকানো') }]} value={state.status ?? ''} onChange={(v) => set({ status: v || undefined })} />
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Search text, name, product…', 'লেখা, নাম, প্রোডাক্ট…')} />
        <FSelect label={L('Rating', 'রেটিং')} value={state.rating ?? ''} onChange={(v) => set({ rating: v || undefined })} options={[5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r}★` }))} />
      </FilterBar>
      {!data ? <TableSk /> : (
        <ul className="space-y-3">
          {data.items.length === 0 && <li className="card p-10 text-center text-mocha">{L('No reviews here', 'কোনো রিভিউ নেই')}</li>}
          {data.items.map((r, i) => (
            <li key={r._id} className={cn('card p-5', r.status === 'pending' && 'border-gold/60')} style={{ animation: `rise .5s var(--ease-silk) ${i * 40}ms both` }}>
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} /><Badge v={r.status} />
                {r.verified && <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><BadgeCheck className="h-3.5 w-3.5" /> {L('Verified buyer', 'যাচাইকৃত ক্রেতা')}</span>}
                <span className="ml-auto text-xs text-mocha">{dateFmt(r.createdAt, lang, true)}</span>
              </div>
              <p className="mt-3 font-semibold">{r.title}</p>
              <p className="mt-1 text-sm text-mocha">{r.body}</p>
              <p className="mt-2 text-xs">{r.customerName} · <a href={`/product/${r.productSlug}`} target="_blank" className="text-bronze hover:underline">{r.productSlug}</a></p>
              {r.reply && <p className="mt-3 rounded-xl bg-blush p-3 text-sm"><b>Ruposhi:</b> {r.reply}</p>}
              {can('marketing.manage') && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status !== 'approved' && <button disabled={busy === r._id} onClick={() => mod(r._id, { status: 'approved' })} className="btn-primary !min-h-9 !px-4 text-xs">{busy === r._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}{L('Approve', 'অনুমোদন')}</button>}
                  {r.status !== 'hidden' && <button disabled={busy === r._id} onClick={() => mod(r._id, { status: 'hidden' })} className="chip !min-h-9 text-xs"><EyeOff className="h-3.5 w-3.5" />{L('Hide', 'লুকান')}</button>}
                  <button onClick={() => (setReplying(replying === r._id ? null : r._id), setReply(r.reply ?? ''))} className="chip !min-h-9 text-xs"><Reply className="h-3.5 w-3.5" />{L('Reply', 'উত্তর')}</button>
                  <button onClick={async () => { if (!confirm(L('Delete review?', 'রিভিউ মুছবেন?'))) return; await apiFetch(`/admin/reviews/${r._id}`, { admin: true, method: 'DELETE' }).catch((e) => toast.error(e.message)); reload(); }} className="chip !min-h-9 text-xs hover:!border-danger hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
              {replying === r._id && (
                <form className="mt-3 flex animate-scale-in gap-2" onSubmit={(e) => { e.preventDefault(); mod(r._id, { reply }); setReplying(null); }}>
                  <input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={1000} placeholder={L('Public reply…', 'পাবলিক উত্তর…')} className="field flex-1 text-sm" autoFocus />
                  <button className="btn-primary !min-h-11">{L('Post', 'পোস্ট')}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
      <span className="hidden">{num(0, lang)}</span>
    </div>
  );
}

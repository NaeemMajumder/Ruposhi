'use client';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { dateFmt } from '@/lib/format';
import { Modal } from '../../ui/Sheet';
import { useAdmin, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, DataTable, DateRange, ExportButton, FilterBar, FSelect, MultiSelect, PageHead, Pager, SearchBox, type Col } from '../ui';

type A = { _id: string; actor: string; role: string; action: string; entity: string; entityId: string; before: unknown; after: unknown; ip?: string; createdAt: string };

export function Audit() {
  const { lang } = useT();
  const L = useL();
  const { state, set, qs } = useUrlState();
  const { data, loading } = useAdmin<Paged<A> & { actors: string[] }>(`/admin/audit?${qs({ limit: PAGE_SIZE })}`);
  const [view, setView] = useState<A | null>(null);
  const cols: Col<A>[] = [
    { key: 'd', head: L('When', 'কখন'), cell: (a) => <span className="whitespace-nowrap text-xs">{dateFmt(a.createdAt, lang, true)}</span> },
    { key: 'a', head: L('Who', 'কে'), cell: (a) => (<div><p className="text-sm font-medium">{a.actor}</p><p className="text-[11px] text-mocha">{a.role}{a.ip ? ` · ${a.ip}` : ''}</p></div>) },
    { key: 'ac', head: L('Action', 'কাজ'), cell: (a) => <Badge v={a.action.includes('delete') || a.action.includes('cancel') ? 'failed' : a.action.includes('price') ? 'pending' : 'draft'} label={a.action} /> },
    { key: 'e', head: L('Record', 'রেকর্ড'), hideSm: true, cell: (a) => <span className="font-mono text-xs text-mocha">{a.entity}/{a.entityId}</span> },
  ];
  return (
    <div>
      <PageHead title={L('Audit log', 'অডিট লগ')} sub={L('Every admin change — who, what, when, from where — with before/after values.', 'প্রতিটি অ্যাডমিন পরিবর্তন — কে, কী, কখন, কোথা থেকে — আগে/পরের মানসহ।')} actions={<ExportButton path={`/admin/audit/export?${qs()}`} />} />
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Search action or record…', 'কাজ বা রেকর্ড খুঁজুন…')} />
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <FSelect label={L('Person', 'ব্যক্তি')} value={state.actor ?? ''} onChange={(v) => set({ actor: v || undefined })} options={(data?.actors ?? []).map((a) => ({ value: a, label: a }))} />
        <MultiSelect label={L('Area', 'অংশ')} value={state.entity ?? ''} onChange={(v) => set({ entity: v || undefined })} options={['order', 'product', 'inventory', 'customer', 'coupon', 'flash_sale', 'review', 'settings', 'cms', 'staff', 'backup'].map((x) => ({ value: x, label: x }))} />
      </FilterBar>
      <DataTable rows={data?.items} cols={cols} loading={loading} rowKey={(a) => a._id} onRow={setView} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
      <Modal open={!!view} onOpenChange={(v) => !v && setView(null)} title={view?.action ?? ''} wide>
        {view && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(['before', 'after'] as const).map((k) => (
              <div key={k}><p className="label capitalize">{k}</p><pre className="max-h-80 overflow-auto rounded-xl bg-sand p-3 text-[11px] leading-relaxed">{JSON.stringify(view[k], null, 2) ?? '—'}</pre></div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

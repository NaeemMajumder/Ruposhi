'use client';
import { Activity, Radar } from 'lucide-react';
import { useT } from '@/i18n/client';
import { dateFmt, money } from '@/lib/format';
import { useAdmin, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, DataTable, DateRange, FilterBar, MultiSelect, PageHead, Pager, Panel } from '../ui';

type E = { _id: string; name: string; eventId: string; sessionId?: string; productSlug?: string; value?: number; count?: number; source?: { channel?: string; utm_campaign?: string }; sentToMeta?: string; sentToGa4?: string; createdAt: string };

export function Tracking() {
  const { lang } = useT();
  const L = useL();
  const { state, set, qs } = useUrlState();
  const { data, loading } = useAdmin<Paged<E>>(`/admin/tracking/events?${qs({ limit: PAGE_SIZE })}`);
  return (
    <div>
      <PageHead title={L('Tracking events', 'ট্র্যাকিং ইভেন্ট')} sub={L('First-party events with server-side Meta Conversions API + GA4 Measurement Protocol (dry-run until keys are added).', 'ফার্স্ট-পার্টি ইভেন্ট, সার্ভার-সাইড মেটা কনভার্সন API + GA4 (কী না দেওয়া পর্যন্ত ড্রাই-রান)।')} />
      <Panel className="mb-4" title={<span className="flex items-center gap-2 text-sm font-semibold"><Radar className="h-4 w-4 text-bronze" /> {L('How dedup works', 'ডিডুপ্লিকেশন কীভাবে কাজ করে')}</span>}>
        <p className="text-sm text-mocha">{L('The browser Pixel and the server send the same event_id for each event, so Meta counts it once. Purchase is fired only by the server after the order is saved — never from the browser alone — so ad reports match real orders. Customer phone/email are SHA-256 hashed before leaving the server.', 'ব্রাউজার পিক্সেল আর সার্ভার প্রতিটি ইভেন্টে একই event_id পাঠায়, তাই মেটা একবারই গোনে। Purchase শুধু অর্ডার সেভ হওয়ার পর সার্ভার থেকে যায় — তাই অ্যাড রিপোর্ট আসল অর্ডারের সাথে মেলে। কাস্টমারের ফোন/ইমেইল সার্ভার থেকে যাওয়ার আগে SHA-256 হ্যাশ হয়।')}</p>
      </Panel>
      <FilterBar>
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <MultiSelect label={L('Event', 'ইভেন্ট')} value={state.name ?? ''} onChange={(v) => set({ name: v || undefined })} options={['page_view', 'view_content', 'search', 'add_to_cart', 'add_to_wishlist', 'initiate_checkout', 'add_payment_info', 'purchase', 'lead', 'complete_registration'].map((x) => ({ value: x, label: x }))} />
      </FilterBar>
      <DataTable rows={data?.items} loading={loading} rowKey={(e) => e._id} empty={L('No events in this range — browse the store to generate some.', 'এই সময়ে কোনো ইভেন্ট নেই — স্টোর ঘুরলে তৈরি হবে।')} cols={[
        { key: 'd', head: L('When', 'কখন'), cell: (e) => <span className="whitespace-nowrap text-xs">{dateFmt(e.createdAt, lang, true)}</span> },
        { key: 'n', head: L('Event', 'ইভেন্ট'), cell: (e) => <span className="inline-flex items-center gap-1.5 font-medium"><Activity className="h-3.5 w-3.5 text-bronze" />{e.name}{e.count ? <span className="text-xs text-mocha">×{e.count}</span> : null}</span> },
        { key: 'p', head: L('Product / value', 'প্রোডাক্ট / মূল্য'), hideSm: true, cell: (e) => <span className="text-xs text-mocha">{e.productSlug ?? ''}{e.value && !e.count ? ` · ${money(e.value, lang)}` : ''}</span> },
        { key: 'c', head: L('Channel', 'চ্যানেল'), hideSm: true, cell: (e) => <span className="text-xs">{e.source?.channel ?? '—'}{e.source?.utm_campaign ? ` · ${e.source.utm_campaign}` : ''}</span> },
        { key: 'm', head: 'Meta CAPI', cell: (e) => <Badge v={e.sentToMeta === 'sent' ? 'sent' : 'draft'} label={e.sentToMeta ?? '—'} /> },
        { key: 'g', head: 'GA4', hideSm: true, cell: (e) => <Badge v={e.sentToGa4 === 'sent' ? 'sent' : 'draft'} label={e.sentToGa4 ?? '—'} /> },
        { key: 'id', head: 'event_id', hideSm: true, cell: (e) => <span className="font-mono text-[10px] text-mocha">{e.eventId.slice(0, 24)}</span> },
      ]} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
    </div>
  );
}

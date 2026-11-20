'use client';
import { useState } from 'react';
import { BellRing, Loader2, MailCheck, MessageSquareText, Send, ShoppingCart } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, dateFmt, money, num } from '@/lib/format';
import { toast } from '../../ui/Toast';
import { useAdmin, useClientPage, useL, useUrlState, PAGE_SIZE } from '../lib';
import type { Paged } from '../types';
import { Badge, DataTable, DateRange, ExportButton, F, FilterBar, FSelect, Kpi, PageHead, Pager, Panel, SearchBox, Tabs, type Col } from '../ui';

type Ab = { _id: string; phone: string; name?: string; items: { name: string; qty: number; price: number; size: string }[]; value: number; recovered: boolean; remindersSent: number; lastReminderAt?: string; createdAt: string };
type Sms = { _id: string; to: string; template: string; message: string; status: string; cost: number; createdAt: string };
type Sub = { _id: string; contact: string; source: string; createdAt: string };
type Msg = { _id: string; name: string; phone: string; subject: string; message: string; status: string; createdAt: string };
type Alert = { _id: string; productSlug: string; phone: string; size?: string; notified: boolean; createdAt: string };

export function Marketing() {
  const L = useL();
  const { state, set } = useUrlState();
  const tab = state.tab ?? 'abandoned';
  return (
    <div>
      <PageHead title={L('Marketing & SMS', 'মার্কেটিং ও SMS')} sub={L('SMS sending is a logged demo — plug your SMS gateway key in the server .env to go live.', 'SMS পাঠানো ডেমো লগ — লাইভ করতে সার্ভারের .env-এ SMS গেটওয়ে কী দিন।')} />
      <Tabs value={tab} onChange={(v) => set({ tab: v === 'abandoned' ? undefined : v, page: undefined, q: undefined, from: undefined, to: undefined })} tabs={[
        { id: 'abandoned', label: L('Abandoned carts', 'অসম্পূর্ণ কার্ট') }, { id: 'campaign', label: L('SMS campaign', 'SMS ক্যাম্পেইন') }, { id: 'sms', label: L('SMS log', 'SMS লগ') },
        { id: 'subscribers', label: L('Subscribers', 'সাবস্ক্রাইবার') }, { id: 'contacts', label: L('Messages', 'বার্তা') }, { id: 'alerts', label: L('Stock alerts', 'স্টক অ্যালার্ট') },
      ]} />
      <div key={tab} className="animate-page">
        {tab === 'abandoned' ? <Abandoned /> : tab === 'campaign' ? <Campaign /> : tab === 'sms' ? <SmsLog /> : tab === 'subscribers' ? <Subscribers /> : tab === 'contacts' ? <Contacts /> : <Alerts />}
      </div>
    </div>
  );
}

function Abandoned() {
  const { lang } = useT();
  const L = useL();
  const { state, set, qs } = useUrlState();
  const { data, loading, reload } = useAdmin<Paged<Ab> & { summary: { count: number; value: number; recovered: number } }>(`/admin/marketing/abandoned?${qs({ limit: PAGE_SIZE, tab: undefined })}`);
  const [busy, setBusy] = useState<string | null>(null);
  const cols: Col<Ab>[] = [
    { key: 'c', head: L('Customer', 'কাস্টমার'), cell: (a) => (<div><p className="font-medium">{a.name || '—'}</p><p className="text-[11px] text-mocha">{a.phone}</p></div>) },
    { key: 'i', head: L('Bag', 'ব্যাগ'), cell: (a) => <span className="line-clamp-2 text-xs text-mocha">{a.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</span> },
    { key: 'v', head: L('Value', 'মূল্য'), cell: (a) => <span className="font-semibold tabular-nums">{money(a.value, lang)}</span> },
    { key: 'd', head: L('When', 'কখন'), hideSm: true, cell: (a) => <span className="text-xs text-mocha">{dateFmt(a.createdAt, lang, true)}</span> },
    { key: 's', head: L('Status', 'অবস্থা'), cell: (a) => <Badge v={a.recovered ? 'paid' : a.remindersSent ? 'pending' : 'unpaid'} label={a.recovered ? L('Recovered', 'রিকভার্ড') : a.remindersSent ? `${a.remindersSent} ${L('reminder', 'রিমাইন্ডার')}` : L('Not contacted', 'যোগাযোগ হয়নি')} /> },
    { key: 'a', head: '', className: 'text-right', cell: (a) => !a.recovered && <button disabled={busy === a._id} onClick={async (e) => { e.stopPropagation(); setBusy(a._id); try { await apiFetch(`/admin/marketing/abandoned/${a._id}/remind`, { admin: true, method: 'POST' }); toast.success(L('Reminder SMS sent', 'রিমাইন্ডার SMS পাঠানো হয়েছে')); reload(); } catch (er) { toast.error((er as Error).message); } finally { setBusy(null); } }} className="chip !min-h-8 !text-xs">{busy === a._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}{L('Remind', 'রিমাইন্ড')}</button> },
  ];
  const s = data?.summary;
  return (
    <>
      <div className="stagger mb-5 grid grid-cols-3 gap-3">
        <Kpi label={L('Abandoned', 'অসম্পূর্ণ')} value={s?.count ?? 0} loading={!s} format={(n) => num(Math.round(n), lang)} icon={ShoppingCart} />
        <Kpi label={L('Value at stake', 'ঝুঁকিতে মূল্য')} value={s?.value ?? 0} loading={!s} format={(n) => money(Math.round(n), lang)} />
        <Kpi label={L('Recovered', 'রিকভার্ড')} value={s?.recovered ?? 0} loading={!s} format={(n) => num(Math.round(n), lang)} />
      </div>
      <FilterBar>
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <FSelect label={L('Status', 'অবস্থা')} value={state.recovered ?? ''} onChange={(v) => set({ recovered: v || undefined })} options={[{ value: 'false', label: L('Open', 'খোলা') }, { value: 'true', label: L('Recovered', 'রিকভার্ড') }]} />
      </FilterBar>
      <DataTable rows={data?.items} cols={cols} loading={loading} rowKey={(a) => a._id} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
    </>
  );
}

function Campaign() {
  const { lang } = useT();
  const L = useL();
  const [segment, setSegment] = useState('repeat');
  const [message, setMessage] = useState('Eid offer: 15% off the new collection with code EID15 — shop at ruposhi.com.bd');
  const [phones, setPhones] = useState('');
  const [preview, setPreview] = useState<{ recipients: number; segmentsPerSms: number; estimatedCost: number; unicode: boolean } | null>(null);
  const [busy, setBusy] = useState<'dry' | 'send' | null>(null);
  const segs = [['all', 'All customers', 'সব কাস্টমার'], ['repeat', 'Repeat buyers (2+)', 'রিপিট ক্রেতা (২+)'], ['vip', 'VIP (৳50k+)', 'ভিআইপি (৳৫০k+)'], ['one_time', 'One-time buyers', 'একবারের ক্রেতা'], ['inactive_60', 'Inactive 60+ days', '৬০+ দিন নিষ্ক্রিয়'], ['subscribers', 'Newsletter subscribers', 'সাবস্ক্রাইবার'], ['custom', 'Custom phone list', 'নিজের ফোন তালিকা']];
  const run = async (dryRun: boolean) => {
    setBusy(dryRun ? 'dry' : 'send');
    try {
      const r = await apiFetch<{ recipients: number; segmentsPerSms: number; estimatedCost: number; unicode: boolean; sent: number }>('/admin/marketing/campaigns', { admin: true, body: { segment, message, dryRun, customPhones: segment === 'custom' ? phones.split(/[\s,]+/).filter(Boolean) : undefined } });
      setPreview(r);
      if (!dryRun) toast.success(`${num(r.sent, lang)} ${L('SMS sent', 'SMS পাঠানো হয়েছে')}`);
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); } finally { setBusy(null); }
  };
  const unicode = /[^\x00-\x7F]/.test(message);
  const per = unicode ? 70 : 160;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Panel title={L('Compose', 'লিখুন')}>
        <F label={L('Audience', 'অডিয়েন্স')}><select value={segment} onChange={(e) => (setSegment(e.target.value), setPreview(null))} className="field">{segs.map(([v, en, bn]) => <option key={v} value={v}>{L(en, bn)}</option>)}</select></F>
        {segment === 'custom' && <F label={L('Phone numbers', 'ফোন নম্বর')} className="mt-3"><textarea rows={3} value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="01711…, 01811…" className="field font-mono text-sm" /></F>}
        <F label={`${L('Message', 'বার্তা')} · ${message.length} ${L('chars', 'অক্ষর')} · ${Math.max(1, Math.ceil(message.length / per))} SMS${unicode ? ' (Unicode)' : ''}`} className="mt-3"><textarea rows={5} maxLength={480} value={message} onChange={(e) => (setMessage(e.target.value), setPreview(null))} className="field" /></F>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={!!busy || message.length < 5} onClick={() => run(true)} className="btn-ghost">{busy === 'dry' && <Loader2 className="h-4 w-4 animate-spin" />}{L('Preview audience & cost', 'অডিয়েন্স ও খরচ দেখুন')}</button>
          <button disabled={!!busy || !preview || !preview.recipients} onClick={() => confirm(L(`Send to ${preview?.recipients} people?`, `${preview?.recipients} জনকে পাঠাবেন?`)) && run(false)} className="btn-primary">{busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{L('Send campaign', 'ক্যাম্পেইন পাঠান')}</button>
        </div>
      </Panel>
      <div className="space-y-4">
        <div className="mx-auto w-full max-w-[300px] rounded-[36px] border-8 border-night bg-sand p-4 shadow-2xl">
          <p className="text-center text-[11px] text-mocha">RUPOSHI</p>
          <div key={message} className="mt-3 animate-scale-in rounded-2xl rounded-tl-sm bg-surface p-3 text-sm shadow">{message}</div>
        </div>
        {preview && (
          <div className="card animate-scale-in p-4 text-sm">
            <p className="flex justify-between"><span className="text-mocha">{L('Recipients', 'প্রাপক')}</span><b>{num(preview.recipients, lang)}</b></p>
            <p className="flex justify-between"><span className="text-mocha">{L('SMS parts each', 'প্রতি জনে SMS')}</span><b>{num(preview.segmentsPerSms, lang)}</b></p>
            <p className="flex justify-between"><span className="text-mocha">{L('Estimated cost', 'আনুমানিক খরচ')}</span><b>৳{preview.estimatedCost.toFixed(2)}</b></p>
          </div>
        )}
      </div>
    </div>
  );
}

function SmsLog() {
  const { lang } = useT();
  const L = useL();
  const { state, set, qs } = useUrlState();
  const { data, loading } = useAdmin<Paged<Sms> & { summary: { total: number; cost: number } }>(`/admin/marketing/sms-logs?${qs({ limit: PAGE_SIZE, tab: undefined })}`);
  const cols: Col<Sms>[] = [
    { key: 'd', head: L('When', 'কখন'), cell: (s) => <span className="text-xs">{dateFmt(s.createdAt, lang, true)}</span> },
    { key: 't', head: L('To', 'প্রাপক'), cell: (s) => <span className="font-mono text-xs">{s.to}</span> },
    { key: 'tp', head: L('Template', 'টেমপ্লেট'), cell: (s) => <Badge v="draft" label={s.template} /> },
    { key: 'm', head: L('Message', 'বার্তা'), hideSm: true, cell: (s) => <span className="line-clamp-1 max-w-md text-xs text-mocha">{s.message}</span> },
    { key: 's', head: L('Status', 'অবস্থা'), cell: (s) => <Badge v={s.status} /> },
  ];
  return (
    <>
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Phone or text…', 'ফোন বা লেখা…')} />
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <FSelect label={L('Template', 'টেমপ্লেট')} value={state.template ?? ''} onChange={(v) => set({ template: v || undefined })} options={['otp', 'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_cancelled', 'abandoned_cart', 'back_in_stock', 'campaign'].map((x) => ({ value: x, label: x }))} />
        {data && <span className="ml-auto text-xs text-mocha"><MessageSquareText className="mr-1 inline h-3.5 w-3.5" />{num(data.summary.total, lang)} SMS · ৳{data.summary.cost.toFixed(2)}</span>}
      </FilterBar>
      <DataTable rows={data?.items} cols={cols} loading={loading} rowKey={(s) => s._id} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
    </>
  );
}

function Subscribers() {
  const { lang } = useT();
  const L = useL();
  const { state, set, qs } = useUrlState();
  const { data, loading } = useAdmin<Paged<Sub>>(`/admin/marketing/subscribers?${qs({ limit: PAGE_SIZE, tab: undefined })}`);
  return (
    <>
      <FilterBar>
        <SearchBox value={state.q ?? ''} onChange={(v) => set({ q: v || undefined })} placeholder={L('Email or phone…', 'ইমেইল বা ফোন…')} />
        <DateRange from={state.from} to={state.to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />
        <span className="ml-auto"><ExportButton path="/admin/marketing/subscribers/export" /></span>
      </FilterBar>
      <DataTable rows={data?.items} loading={loading} rowKey={(s) => s._id} cols={[
        { key: 'c', head: L('Contact', 'যোগাযোগ'), cell: (s) => <span className="font-medium"><MailCheck className="mr-2 inline h-4 w-4 text-success" />{s.contact}</span> },
        { key: 's', head: L('Source', 'উৎস'), cell: (s) => <Badge v="draft" label={s.source} /> },
        { key: 'd', head: L('Joined', 'যোগদান'), cell: (s) => <span className="text-xs text-mocha">{dateFmt(s.createdAt, lang)}</span> },
      ]} />
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: String(p) }, false)} />}
    </>
  );
}

function Contacts() {
  const { lang } = useT();
  const L = useL();
  const { data, reload } = useAdmin<Msg[]>('/admin/marketing/contacts');
  const [open, setOpen] = useState<string | null>(null);
  const pg = useClientPage(data);
  return (
    <>
    <ul className="space-y-3">
      {!data && <li className="skeleton h-24" />}
      {pg.rows?.map((m, i) => (
        <li key={m._id} className={cn('card p-5', m.status === 'new' && 'border-gold/60')} style={{ animation: `rise .5s var(--ease-silk) ${i * 40}ms both` }}>
          <button className="flex w-full flex-wrap items-center gap-3 text-left" onClick={async () => { setOpen(open === m._id ? null : m._id); if (m.status === 'new') { await apiFetch(`/admin/marketing/contacts/${m._id}`, { admin: true, method: 'PATCH', body: { status: 'read' } }).catch(() => {}); reload(); } }}>
            <Badge v={m.status} /><b>{m.subject}</b><span className="text-sm text-mocha">{m.name} · {m.phone}</span><span className="ml-auto text-xs text-mocha">{dateFmt(m.createdAt, lang, true)}</span>
          </button>
          {open === m._id && (
            <div className="mt-3 animate-fade">
              <p className="rounded-xl bg-sand p-3 text-sm">{m.message}</p>
              <div className="mt-3 flex gap-2">
                <a href={`https://wa.me/88${m.phone}`} target="_blank" rel="noopener noreferrer" className="chip !min-h-9 text-xs">WhatsApp</a>
                <a href={`tel:${m.phone}`} className="chip !min-h-9 text-xs">{L('Call', 'কল')}</a>
                {m.status !== 'replied' && <button onClick={async () => { await apiFetch(`/admin/marketing/contacts/${m._id}`, { admin: true, method: 'PATCH', body: { status: 'replied' } }); reload(); }} className="btn-primary !min-h-9 !px-4 text-xs">{L('Mark replied', 'উত্তর দেওয়া হয়েছে')}</button>}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
    {data && <Pager {...pg.pager} />}
    </>
  );
}

function Alerts() {
  const { lang } = useT();
  const L = useL();
  const { data } = useAdmin<Alert[]>('/admin/marketing/stock-alerts');
  const pg = useClientPage(data);
  return (
    <>
    <DataTable rows={pg.rows} rowKey={(a) => a._id} empty={L('No one is waiting for a restock', 'কেউ রিস্টকের অপেক্ষায় নেই')} cols={[
      { key: 'p', head: L('Product', 'প্রোডাক্ট'), cell: (a) => <span className="font-medium"><BellRing className="mr-2 inline h-4 w-4 text-bronze" />{a.productSlug}</span> },
      { key: 's', head: L('Size', 'সাইজ'), cell: (a) => a.size ?? '—' },
      { key: 'ph', head: L('Phone', 'ফোন'), cell: (a) => <span className="font-mono text-xs">{a.phone}</span> },
      { key: 'n', head: L('Status', 'অবস্থা'), cell: (a) => <Badge v={a.notified ? 'sent' : 'pending'} label={a.notified ? L('SMS sent', 'SMS গেছে') : L('Waiting', 'অপেক্ষায়')} /> },
      { key: 'd', head: L('Since', 'থেকে'), cell: (a) => <span className="text-xs text-mocha">{dateFmt(a.createdAt, lang)}</span> },
    ]} />
    {data && <Pager {...pg.pager} />}
    </>
  );
}

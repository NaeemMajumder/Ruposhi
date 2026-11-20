'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/client-api';
import type { I18n } from '@/lib/types';
import { toast } from '../../ui/Toast';
import { ImageUpload } from '../ImageUpload';
import { DashboardSk } from '../../ui/Skeletons';
import { useAdmin, useL, useUrlState } from '../lib';
import { F, PageHead, Panel, Tabs } from '../ui';

type Hero = { eyebrow: I18n; title: I18n; subtitle: I18n; cta: I18n; href: string; image: string };
type Cms = { announcements: I18n[]; hero: Hero[]; lookbook: { image: string; caption: I18n; productSlug: string }[]; testimonials: { name: string; city: string; text: I18n; rating: number }[]; promises: { title: I18n; text: I18n }[] };
const E = (): I18n => ({ en: '', bn: '' });

function Bi({ label, v, onChange, area }: { label: string; v: I18n; onChange: (v: I18n) => void; area?: boolean }) {
  const Tag = area ? 'textarea' : 'input';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <F label={`${label} (EN)`}><Tag value={v.en} onChange={(e) => onChange({ ...v, en: e.target.value })} className="field text-sm" rows={2} /></F>
      <F label={`${label} (BN)`}><Tag value={v.bn} onChange={(e) => onChange({ ...v, bn: e.target.value })} className="field text-sm" rows={2} /></F>
    </div>
  );
}

function ListEditor<T>({ items, onChange, make, render, max }: { items: T[]; onChange: (v: T[]) => void; make: () => T; render: (it: T, set: (v: T) => void, i: number) => React.ReactNode; max: number }) {
  const L = useL();
  const move = (i: number, d: number) => { const a = [...items]; [a[i], a[i + d]] = [a[i + d], a[i]]; onChange(a); };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="card relative animate-scale-in p-4">
          <div className="absolute right-3 top-3 flex gap-1">
            <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand disabled:opacity-30" aria-label="Up"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-sand disabled:opacity-30" aria-label="Down"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-danger/10 hover:text-danger" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className="mb-3 text-xs font-semibold text-mocha">#{i + 1}</p>
          {render(it, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}
        </div>
      ))}
      {items.length < max && <button type="button" onClick={() => onChange([...items, make()])} className="btn-ghost w-full border-dashed"><Plus className="h-4 w-4" /> {L('Add', 'যোগ করুন')}</button>}
    </div>
  );
}

export function Content() {
  const L = useL();
  const { state, set } = useUrlState();
  const tab = state.tab ?? 'hero';
  const { data, reload } = useAdmin<Cms>('/admin/cms');
  const [c, setC] = useState<Cms | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setC(data); }, [data]);
  // uploading an image only fills the form — nothing is stored until Publish, so make unsaved edits obvious
  const dirty = !!data && !!c && JSON.stringify(c) !== JSON.stringify(data);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  if (!c) return <DashboardSk />;
  const save = async () => {
    setBusy(true);
    try { await apiFetch('/admin/cms', { admin: true, method: 'PUT', body: { announcements: c.announcements, hero: c.hero, lookbook: c.lookbook, testimonials: c.testimonials, promises: c.promises } }); toast.success(L('Homepage updated (live within a minute)', 'হোমপেজ আপডেট হয়েছে (এক মিনিটে লাইভ)')); reload(); } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); } finally { setBusy(false); }
  };
  const img = (src: string) => src ? <span className="media relative mb-3 block aspect-[16/9] max-w-xs overflow-hidden rounded-xl"><Image src={src} alt="" fill sizes="320px" unoptimized className="object-cover" /></span> : null;
  return (
    <div className="pb-20">
      <PageHead title={L('Homepage content', 'হোমপেজ কনটেন্ট')} sub={L('Bilingual. Changes appear on the store within ~60 seconds (ISR).', 'দুই ভাষায়। স্টোরে ~৬০ সেকেন্ডে দেখা যাবে।')} actions={<><a href="/" target="_blank" className="btn-ghost !min-h-10 text-sm">{L('Preview', 'প্রিভিউ')}</a><button onClick={save} disabled={busy} className="btn-primary !min-h-10">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{L('Publish', 'পাবলিশ')}</button></>} />
      {dirty && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6" role="status">
          <div className="flex animate-scale-in items-center gap-3 rounded-full bg-espresso py-2 pl-5 pr-2 text-sm text-cream shadow-lg">
            {L('Unsaved changes — not on the store yet', 'পরিবর্তন এখনো সেভ হয়নি — স্টোরে যায়নি')}
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-gold px-4 py-1.5 font-semibold text-espresso disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{L('Publish', 'পাবলিশ')}
            </button>
          </div>
        </div>
      )}
      <Tabs value={tab} onChange={(v) => set({ tab: v === 'hero' ? undefined : v })} tabs={[{ id: 'hero', label: L('Hero slides', 'হিরো') }, { id: 'announce', label: L('Announcement bar', 'ঘোষণা বার') }, { id: 'lookbook', label: L('Lookbook', 'লুকবুক') }, { id: 'testimonials', label: L('Testimonials', 'রিভিউ') }, { id: 'promises', label: L('Promises', 'প্রতিশ্রুতি') }]} />
      <div key={tab} className="animate-page">
        {tab === 'hero' && <ListEditor max={5} items={c.hero} onChange={(hero) => setC({ ...c, hero })} make={() => ({ eyebrow: E(), title: E(), subtitle: E(), cta: E(), href: '/shop', image: '' })} render={(h, s) => (
          <div className="space-y-3">{img(h.image)}
            <Bi label={L('Eyebrow', 'উপরের লেখা')} v={h.eyebrow} onChange={(v) => s({ ...h, eyebrow: v })} />
            <Bi label={L('Title (use a new line)', 'শিরোনাম')} v={h.title} onChange={(v) => s({ ...h, title: v })} area />
            <Bi label={L('Subtitle', 'সাবটাইটেল')} v={h.subtitle} onChange={(v) => s({ ...h, subtitle: v })} area />
            <Bi label={L('Button', 'বাটন')} v={h.cta} onChange={(v) => s({ ...h, cta: v })} />
            <div className="grid gap-2 sm:grid-cols-2"><F label={L('Link', 'লিংক')}><input value={h.href} onChange={(e) => s({ ...h, href: e.target.value })} className="field text-sm" /></F><F label={L('Image URL', 'ছবির URL')}><input value={h.image} onChange={(e) => s({ ...h, image: e.target.value })} className="field text-sm" /><ImageUpload kind="banners" compact onUploaded={([url]) => s({ ...h, image: url })} /></F></div>
          </div>
        )} />}
        {tab === 'announce' && <Panel><ListEditor max={6} items={c.announcements} onChange={(announcements) => setC({ ...c, announcements })} make={E} render={(a, s) => <Bi label={L('Message', 'বার্তা')} v={a} onChange={s} />} /></Panel>}
        {tab === 'lookbook' && <ListEditor max={12} items={c.lookbook} onChange={(lookbook) => setC({ ...c, lookbook })} make={() => ({ image: '', caption: E(), productSlug: '' })} render={(l, s) => (
          <div className="space-y-3">{img(l.image)}<Bi label={L('Caption', 'ক্যাপশন')} v={l.caption} onChange={(v) => s({ ...l, caption: v })} />
            <div className="grid gap-2 sm:grid-cols-2"><F label={L('Image URL', 'ছবির URL')}><input value={l.image} onChange={(e) => s({ ...l, image: e.target.value })} className="field text-sm" /><ImageUpload kind="lookbook" compact onUploaded={([url]) => s({ ...l, image: url })} /></F><F label={L('Product slug', 'প্রোডাক্ট স্লাগ')}><input value={l.productSlug} onChange={(e) => s({ ...l, productSlug: e.target.value })} className="field font-mono text-sm" /></F></div>
          </div>
        )} />}
        {tab === 'testimonials' && <ListEditor max={12} items={c.testimonials} onChange={(testimonials) => setC({ ...c, testimonials })} make={() => ({ name: '', city: '', text: E(), rating: 5 })} render={(t, s) => (
          <div className="space-y-3"><div className="grid gap-2 sm:grid-cols-3"><F label={L('Name', 'নাম')}><input value={t.name} onChange={(e) => s({ ...t, name: e.target.value })} className="field text-sm" /></F><F label={L('City', 'শহর')}><input value={t.city} onChange={(e) => s({ ...t, city: e.target.value })} className="field text-sm" /></F><F label={L('Rating', 'রেটিং')}><select value={t.rating} onChange={(e) => s({ ...t, rating: Number(e.target.value) })} className="field text-sm">{[5, 4, 3].map((r) => <option key={r} value={r}>{r}★</option>)}</select></F></div><Bi label={L('Text', 'লেখা')} v={t.text} onChange={(v) => s({ ...t, text: v })} area /></div>
        )} />}
        {tab === 'promises' && <ListEditor max={6} items={c.promises} onChange={(promises) => setC({ ...c, promises })} make={() => ({ title: E(), text: E() })} render={(p, s) => <div className="space-y-3"><Bi label={L('Title', 'শিরোনাম')} v={p.title} onChange={(v) => s({ ...p, title: v })} /><Bi label={L('Text', 'লেখা')} v={p.text} onChange={(v) => s({ ...p, text: v })} area /></div>} />}
      </div>
    </div>
  );
}

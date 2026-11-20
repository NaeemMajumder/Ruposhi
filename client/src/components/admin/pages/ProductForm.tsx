'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { cn, money, num } from '@/lib/format';
import { shake } from '@/lib/motion';
import type { I18n } from '@/lib/types';
import { toast } from '../../ui/Toast';
import { ImageUpload } from '../ImageUpload';
import { youtubeId, youtubeThumb } from '@/lib/youtube';
import { DashboardSk } from '../../ui/Skeletons';
import { lbl } from '../labels';
import { useAdmin, useCan, useL } from '../lib';
import { ErrorBox, F, Panel, Toggle } from '../ui';

type Variant = { sku: string; color: string; size: string; stock: number };
type Form = {
  slug: string; sku: string; name: I18n; shortDescription: I18n; description: I18n; care: I18n; category: string; gender: 'men' | 'women'; fabric: string;
  occasions: string[]; tags: string[]; badges: string[]; colors: { name: I18n; hex: string }[]; sizes: string[]; variants: Variant[];
  price: number; compareAtPrice?: number; costPrice: number; images: { url: string; alt: I18n }[]; videoUrl: string;
  isFeatured: boolean; isNewArrival: boolean; preOrder: boolean; status: 'active' | 'draft' | 'archived'; seo: { title: string; description: string }; completeTheLook: string[];
};
const E: I18n = { en: '', bn: '' };
const BLANK: Form = {
  slug: '', sku: '', name: { ...E }, shortDescription: { ...E }, description: { ...E }, care: { en: 'Dry clean recommended.', bn: 'ড্রাই ক্লিন করার পরামর্শ।' }, category: 'saree', gender: 'women', fabric: '',
  occasions: [], tags: [], badges: [], colors: [{ name: { en: 'Default', bn: 'ডিফল্ট' }, hex: '#8a5f38' }], sizes: ['Free Size'], variants: [], price: 0, compareAtPrice: undefined, costPrice: 0,
  images: [], videoUrl: '', isFeatured: false, isNewArrival: true, preOrder: false, status: 'draft', seo: { title: '', description: '' }, completeTheLook: [],
};
const SIZE_PRESETS: Record<string, string[]> = { saree: ['Free Size'], panjabi: ['38', '40', '42', '44', '46'], 'salwar-kameez': ['S', 'M', 'L', 'XL', 'XXL'], kurti: ['S', 'M', 'L', 'XL', 'XXL'] };
const OCCASIONS = ['wedding', 'eid', 'gaye-holud', 'party', 'festive', 'office', 'casual', 'puja', 'boishakh'];

export function ProductForm({ id }: { id: string | null }) {
  const { lang } = useT();
  const L = useL();
  const can = useCan();
  const router = useRouter();
  const { data, error, reload } = useAdmin<Form & { _id: string }>(id ? `/admin/products/${id}` : null);
  const [f, setF] = useState<Form>(BLANK);
  const [tab, setTab] = useState<'en' | 'bn'>('en');
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) setF({ ...BLANK, ...data, videoUrl: data.videoUrl ?? '', completeTheLook: data.completeTheLook ?? [], seo: data.seo ?? BLANK.seo });
  }, [data]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const up = <K extends keyof Form>(k: K, v: Form[K]) => (setF((s) => ({ ...s, [k]: v })), setDirty(true));
  const upI = (k: 'name' | 'shortDescription' | 'description' | 'care', v: string) => up(k, { ...f[k], [tab]: v });

  // variant matrix = colours × sizes; keeps existing stock/SKU when re-generated
  const matrix = useMemo(() => {
    const out: Variant[] = [];
    for (const c of f.colors) for (const s of f.sizes) {
      const ex = f.variants.find((v) => v.color === c.name.en && v.size === s);
      out.push(ex ?? { sku: `${f.sku || 'SKU'}-${c.name.en.slice(0, 3).toUpperCase()}-${s.replace(/\s+/g, '').toUpperCase()}`.replace(/[^A-Za-z0-9-]/g, ''), color: c.name.en, size: s, stock: 0 });
    }
    return out;
  }, [f.colors, f.sizes, f.variants, f.sku]);
  const setStock = (v: Variant, stock: number) => up('variants', matrix.map((x) => (x.color === v.color && x.size === v.size ? { ...x, stock: Math.max(0, stock) } : x)));
  const total = matrix.reduce((s, v) => s + v.stock, 0);
  const margin = f.price ? Math.round(((f.price - f.costPrice) / f.price) * 100) : 0;

  const save = async () => {
    const body = { ...f, variants: matrix, compareAtPrice: f.compareAtPrice || undefined, videoUrl: f.videoUrl || '', slug: f.slug.trim() };
    setBusy(true);
    setErrs({});
    try {
      const r = await apiFetch<{ _id: string }>(id ? `/admin/products/${id}` : '/admin/products', { admin: true, method: id ? 'PATCH' : 'POST', body });
      setDirty(false);
      toast.success(L('Product saved', 'প্রোডাক্ট সেভ হয়েছে'));
      if (!id) router.replace(`/admin/products/${r._id}`);
      else reload();
    } catch (e) {
      if (e instanceof ApiError && Array.isArray(e.details)) setErrs(Object.fromEntries((e.details as { path: string; message: string }[]).map((d) => [d.path, d.message])));
      toast.error(e instanceof ApiError ? e.message : 'Error');
      shake(document.querySelector('[data-save]'));
    } finally {
      setBusy(false);
    }
  };

  if (id && error && !data) return <ErrorBox msg={error.message} onRetry={reload} />;
  if (id && !data) return <DashboardSk />;
  const err = (k: string) => errs[k] && <span className="mt-1 block animate-fade text-xs text-danger">{errs[k]}</span>;
  const readOnly = !can('products.edit');

  return (
    <div className="pb-24">
      <Link href="/admin/products" className="btn-link mb-4"><ArrowLeft className="h-4 w-4" /> {L('Products', 'প্রোডাক্ট')}</Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="animate-rise font-display text-[34px] leading-none sm:text-[42px]">{id ? f.name.en || L('Edit product', 'প্রোডাক্ট এডিট') : L('New product', 'নতুন প্রোডাক্ট')}</h1>
        {id && f.slug && <Link href={`/product/${f.slug}`} target="_blank" className="btn-ghost !min-h-10 text-sm">{L('View on store', 'স্টোরে দেখুন')} <ExternalLink className="h-4 w-4" /></Link>}
      </div>

      <fieldset disabled={readOnly} className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Panel title={L('Basics', 'মৌলিক তথ্য')} action={
            <div className="inline-flex rounded-full bg-sand p-0.5 text-xs font-semibold">
              {(['en', 'bn'] as const).map((l) => <button type="button" key={l} onClick={() => setTab(l)} className={cn('min-h-8 rounded-full px-3 transition', tab === l ? 'bg-espresso text-cream' : 'text-mocha')}>{l === 'en' ? 'English' : 'বাংলা'}</button>)}
            </div>
          }>
            <div key={tab} className="animate-fade space-y-4">
              <F label={`${L('Name', 'নাম')} (${tab.toUpperCase()}) *`}><input value={f.name[tab]} onChange={(e) => upI('name', e.target.value)} maxLength={160} className="field" />{err('name.en')}</F>
              <F label={`${L('Short description', 'সংক্ষিপ্ত বিবরণ')} (${tab.toUpperCase()})`}><input value={f.shortDescription[tab]} onChange={(e) => upI('shortDescription', e.target.value)} maxLength={300} className="field" /></F>
              <F label={`${L('Description', 'বিবরণ')} (${tab.toUpperCase()})`}><textarea rows={5} value={f.description[tab]} onChange={(e) => upI('description', e.target.value)} maxLength={4000} className="field" /></F>
              <F label={`${L('Care', 'যত্ন')} (${tab.toUpperCase()})`}><input value={f.care[tab]} onChange={(e) => upI('care', e.target.value)} maxLength={500} className="field" /></F>
            </div>
          </Panel>

          <Panel title={L('Images & video', 'ছবি ও ভিডিও')}>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {f.images.map((im, i) => (
                <li key={im.url + i} className="group relative animate-scale-in">
                  <span className="media relative block aspect-[3/4] overflow-hidden rounded-xl"><Image src={im.url} alt="" fill sizes="140px" unoptimized className="object-cover" /></span>
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-night/70 px-2 py-0.5 text-[10px] font-semibold text-ivory">{L('Cover', 'কভার')}</span>}
                  <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <span className="flex gap-1">
                      <button type="button" disabled={i === 0} onClick={() => { const a = [...f.images]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; up('images', a); }} className="grid h-7 w-7 place-items-center rounded-full bg-ivory/90 text-night disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={i === f.images.length - 1} onClick={() => { const a = [...f.images]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; up('images', a); }} className="grid h-7 w-7 place-items-center rounded-full bg-ivory/90 text-night disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </span>
                    <button type="button" onClick={() => up('images', f.images.filter((_, j) => j !== i))} className="grid h-7 w-7 place-items-center rounded-full bg-danger text-ivory" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
            </ul>
            <ImageUpload kind="products" multiple max={12 - f.images.length} onUploaded={(urls) => (setF((s) => ({ ...s, images: [...s.images, ...urls.map((url) => ({ url, alt: { en: s.name.en, bn: s.name.bn } }))].slice(0, 12) })), setDirty(true))} />
            <AddImage onAdd={(url) => up('images', [...f.images, { url, alt: { en: f.name.en, bn: f.name.bn } }])} />
            {err('images')}
            <F label={L('YouTube video link', 'YouTube ভিডিও লিংক')} className="mt-4" hint={L('Paste a YouTube or Shorts link. Leave empty to show the animated photo film.', 'YouTube বা Shorts-এর লিংক দিন। খালি রাখলে ছবির অ্যানিমেটেড ফিল্ম দেখাবে।')}>
              <input value={f.videoUrl} onChange={(e) => { const v = e.target.value.trim(); up('videoUrl', /<iframe/i.test(v) ? (v.match(/src=["']([^"']+)["']/i)?.[1] ?? v) : v); }} placeholder={L('YouTube link or embed code', 'YouTube লিংক বা embed কোড')} inputMode="url" className="field" />
              {f.videoUrl && !youtubeId(f.videoUrl) && <p className="mt-1.5 text-xs font-medium text-danger">{L('This is not a YouTube link.', 'এটা YouTube লিংক না।')}</p>}
              {youtubeId(f.videoUrl) && (
                <a href={f.videoUrl} target="_blank" rel="noreferrer" className="mt-2 flex w-60 animate-scale-in items-center gap-3 rounded-xl border border-line p-1.5 pr-3 text-xs transition hover:border-bronze/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={youtubeThumb(youtubeId(f.videoUrl)!)} alt="" className="h-12 w-20 rounded-lg object-cover" />
                  <span className="font-semibold">{L('Video linked ✓', 'ভিডিও যুক্ত ✓')}</span>
                </a>
              )}
              {err('videoUrl')}
            </F>
          </Panel>

          <Panel title={L('Variants & stock', 'ভ্যারিয়েন্ট ও স্টক')} action={<span className="text-xs text-mocha">{num(matrix.length, lang)} SKU · {num(total, lang)} {L('units', 'পিস')}</span>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="label">{L('Colours', 'রং')}</span>
                <ul className="space-y-2">
                  {f.colors.map((c, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <input type="color" value={c.hex} onChange={(e) => up('colors', f.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent" aria-label="Colour" />
                      <input value={c.name.en} onChange={(e) => up('colors', f.colors.map((x, j) => (j === i ? { ...x, name: { ...x.name, en: e.target.value } } : x)))} placeholder="Name (EN)" className="field !py-2 text-sm" />
                      <input value={c.name.bn} onChange={(e) => up('colors', f.colors.map((x, j) => (j === i ? { ...x, name: { ...x.name, bn: e.target.value } } : x)))} placeholder="নাম (BN)" className="field !py-2 text-sm" />
                      {f.colors.length > 1 && <button type="button" onClick={() => up('colors', f.colors.filter((_, j) => j !== i))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="Remove colour"><X className="h-4 w-4" /></button>}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => up('colors', [...f.colors, { name: { en: '', bn: '' }, hex: '#c9a07a' }])} className="btn-link mt-2 text-xs"><Plus className="h-3.5 w-3.5" /> {L('Add colour', 'রং যোগ')}</button>
              </div>
              <div>
                <span className="label">{L('Sizes', 'সাইজ')}</span>
                <ChipsInput value={f.sizes} onChange={(v) => up('sizes', v)} placeholder={L('Type and press Enter', 'লিখে এন্টার চাপুন')} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(SIZE_PRESETS).map(([k, v]) => <button type="button" key={k} onClick={() => up('sizes', v)} className="chip !min-h-7 !text-[11px]">{lbl(k, lang)}</button>)}
                </div>
              </div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="bg-sand text-left text-xs text-mocha"><tr><th className="px-3 py-2">{L('Colour', 'রং')}</th><th className="px-3 py-2">{L('Size', 'সাইজ')}</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2 text-right">{L('Stock', 'স্টক')}</th></tr></thead>
                <tbody>
                  {matrix.map((v) => (
                    <tr key={v.color + v.size} className="border-t border-line">
                      <td className="px-3 py-2">{v.color}</td>
                      <td className="px-3 py-2">{v.size}</td>
                      <td className="px-3 py-2"><input value={v.sku} onChange={(e) => up('variants', matrix.map((x) => (x === v ? { ...x, sku: e.target.value.toUpperCase() } : x)))} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-mono text-xs hover:border-line focus:border-bronze focus:outline-none" /></td>
                      <td className="px-3 py-2 text-right"><input type="number" min={0} value={v.stock} onChange={(e) => setStock(v, Number(e.target.value))} className={cn('w-20 rounded-lg border border-line bg-surface px-2 py-1 text-right tabular-nums', v.stock === 0 && 'text-danger')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-mocha">{L('Stock changes here are logged; for restocks with a reason use Inventory.', 'এখানের স্টক পরিবর্তন লগ হয়; কারণসহ রিস্টকের জন্য ইনভেন্টরি ব্যবহার করুন।')}</p>
          </Panel>

          <Panel title="SEO">
            <F label={`${L('Meta title', 'মেটা টাইটেল')} (${f.seo.title.length}/70)`}><input value={f.seo.title} maxLength={70} onChange={(e) => up('seo', { ...f.seo, title: e.target.value })} placeholder={f.name.en} className="field" /></F>
            <F label={`${L('Meta description', 'মেটা বিবরণ')} (${f.seo.description.length}/170)`} className="mt-3"><textarea rows={2} value={f.seo.description} maxLength={170} onChange={(e) => up('seo', { ...f.seo, description: e.target.value })} placeholder={f.shortDescription.en} className="field" /></F>
            <F label="Slug (URL)" className="mt-3" hint={L('Leave empty to generate from the name.', 'খালি রাখলে নাম থেকে তৈরি হবে।')}><input value={f.slug} onChange={(e) => up('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="field font-mono text-sm" /></F>
            <div className="mt-4 rounded-xl border border-line p-4">
              <p className="text-xs text-mocha">ruposhi.com.bd › product › {f.slug || '…'}</p>
              <p className="mt-1 line-clamp-1 text-[17px] text-[#1a0dab] dark:text-[#8ab4f8]">{f.seo.title || f.name.en || 'Product title'} | Ruposhi</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-mocha">{f.seo.description || f.shortDescription.en || 'Meta description preview…'}</p>
            </div>
          </Panel>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel title={L('Publishing', 'প্রকাশ')}>
            <div className="grid grid-cols-3 gap-1 rounded-full bg-sand p-1 text-xs font-semibold">
              {(['active', 'draft', 'archived'] as const).map((s) => <button type="button" key={s} onClick={() => up('status', s)} className={cn('min-h-8 rounded-full capitalize transition', f.status === s ? 'bg-surface shadow' : 'text-mocha')}>{s}</button>)}
            </div>
            <div className="mt-3 space-y-2">
              <Toggle label={L('Featured on homepage', 'হোমপেজে ফিচার্ড')} checked={f.isFeatured} onChange={(v) => up('isFeatured', v)} />
              <Toggle label={L('New arrival', 'নতুন এসেছে')} checked={f.isNewArrival} onChange={(v) => up('isNewArrival', v)} />
              <Toggle label={L('Allow pre-order', 'প্রি-অর্ডার চালু')} checked={f.preOrder} onChange={(v) => up('preOrder', v)} />
            </div>
          </Panel>
          <Panel title={L('Pricing', 'দাম')}>
            <div className="grid grid-cols-2 gap-3">
              <F label={`${L('Price', 'দাম')} ৳ *`}><input type="number" min={0} value={f.price || ''} onChange={(e) => up('price', Number(e.target.value))} className="field" />{err('price')}</F>
              <F label={`${L('Compare at', 'আগের দাম')} ৳`}><input type="number" min={0} value={f.compareAtPrice || ''} onChange={(e) => up('compareAtPrice', Number(e.target.value) || undefined)} className="field" /></F>
              <F label={`${L('Cost', 'খরচ')} ৳ *`} className="col-span-2" hint={L('Private — never shown on the store.', 'গোপন — স্টোরে দেখানো হয় না।')}><input type="number" min={0} value={f.costPrice || ''} onChange={(e) => up('costPrice', Number(e.target.value))} className="field" /></F>
            </div>
            <div className="mt-3 flex justify-between rounded-xl bg-sand px-3 py-2 text-sm"><span className="text-mocha">{L('Margin', 'মার্জিন')}</span><span className={cn('font-semibold tabular-nums', margin < 20 ? 'text-danger' : 'text-success')}>{margin}% · {money(f.price - f.costPrice, lang)}</span></div>
          </Panel>
          <Panel title={L('Organisation', 'শ্রেণিবিন্যাস')}>
            <div className="grid grid-cols-2 gap-3">
              <F label="SKU *"><input value={f.sku} onChange={(e) => up('sku', e.target.value.toUpperCase())} maxLength={40} className="field font-mono text-sm" />{err('sku')}</F>
              <F label={L('Fabric', 'কাপড়')}><input value={f.fabric} onChange={(e) => up('fabric', e.target.value)} maxLength={40} className="field" /></F>
              <F label={L('Category', 'ক্যাটাগরি')}><select value={f.category} onChange={(e) => (up('category', e.target.value), up('gender', e.target.value === 'panjabi' ? 'men' : 'women'))} className="field">{Object.keys(SIZE_PRESETS).map((c) => <option key={c} value={c}>{lbl(c, lang)}</option>)}</select></F>
              <F label={L('For', 'যার জন্য')}><select value={f.gender} onChange={(e) => up('gender', e.target.value as 'men')} className="field"><option value="women">{L('Women', 'নারী')}</option><option value="men">{L('Men', 'পুরুষ')}</option></select></F>
            </div>
            <span className="label mt-4">{L('Occasions', 'উপলক্ষ')}</span>
            <div className="flex flex-wrap gap-1.5">
              {OCCASIONS.map((o) => <button type="button" key={o} onClick={() => up('occasions', f.occasions.includes(o) ? f.occasions.filter((x) => x !== o) : [...f.occasions, o])} className={cn('chip !min-h-8 !text-xs capitalize', f.occasions.includes(o) && 'chip-on')}>{o.replace('-', ' ')}</button>)}
            </div>
            <span className="label mt-4">{L('Badges', 'ব্যাজ')}</span>
            <div className="flex flex-wrap gap-1.5">
              {['bestseller', 'limited', 'new'].map((b) => <button type="button" key={b} onClick={() => up('badges', f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b])} className={cn('chip !min-h-8 !text-xs capitalize', f.badges.includes(b) && 'chip-on')}>{b}</button>)}
            </div>
            <span className="label mt-4">{L('Search tags (Banglish too)', 'সার্চ ট্যাগ (বাংলিশসহ)')}</span>
            <ChipsInput value={f.tags} onChange={(v) => up('tags', v)} placeholder="jamdani, jamdhani, shari…" />
          </Panel>
        </div>
      </fieldset>

      {!readOnly && (
        <div className={cn('fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur-md transition-transform duration-500 ease-[var(--ease-silk)] lg:left-64', dirty || !id ? 'translate-y-0' : 'translate-y-full')}>
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm text-mocha">{dirty ? L('Unsaved changes', 'সেভ হয়নি এমন পরিবর্তন') : L('New product', 'নতুন প্রোডাক্ট')}</p>
            <button data-save onClick={save} disabled={busy} className="btn-primary !min-h-11">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {L('Save product', 'প্রোডাক্ট সেভ')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipsInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [v, setV] = useState('');
  const add = () => {
    const parts = v.split(',').map((x) => x.trim()).filter(Boolean).filter((x) => !value.includes(x));
    if (parts.length) onChange([...value, ...parts]);
    setV('');
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-2 focus-within:border-bronze">
      {value.map((x) => (
        <span key={x} className="inline-flex animate-scale-in items-center gap-1 rounded-full bg-sand px-2.5 py-1 text-xs">{x}<button type="button" onClick={() => onChange(value.filter((y) => y !== x))} aria-label={`Remove ${x}`}><X className="h-3 w-3" /></button></span>
      ))}
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} onBlur={add} placeholder={placeholder} className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm focus:outline-none" />
    </div>
  );
}

function AddImage({ onAdd }: { onAdd: (url: string) => void }) {
  const L = useL();
  const [url, setUrl] = useState('');
  return (
    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); try { const u = new URL(url); if (!/^https:$/.test(u.protocol)) throw 0; onAdd(url); setUrl(''); } catch { toast.error(L('Enter a valid https image URL', 'সঠিক https ছবির URL দিন')); } }}>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={L('…or paste an image link (https://)', '…অথবা ছবির লিংক পেস্ট করুন (https://)')} className="field flex-1 text-sm" />
      <button className="btn-ghost !min-h-11 shrink-0"><Plus className="h-4 w-4" /> {L('Add image', 'ছবি যোগ')}</button>
    </form>
  );
}

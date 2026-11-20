'use client';
import { useEffect, useState } from 'react';
import { CreditCard, Loader2, MessageSquareText, Radar, Save, Store, Truck } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/client-api';
import { toast } from '../../ui/Toast';
import { DashboardSk } from '../../ui/Skeletons';
import { useAdmin, useL, useUrlState } from '../lib';
import { F, PageHead, Panel, Tabs, Toggle } from '../ui';

type S = {
  store: Record<'name' | 'email' | 'phone' | 'address' | 'whatsapp' | 'facebook' | 'instagram' | 'youtube', string>;
  delivery: { insideDhaka: number; dhakaSuburb: number; outsideDhaka: number; freeShippingThreshold: number; insideDays: string; outsideDays: string; giftWrapFee: number };
  payments: { cod: boolean; bkashManual: boolean; nagadManual: boolean; bkash: boolean; sslcommerz: boolean; codAdvanceDeliveryCharge: boolean; codOtpRequired: boolean; bkashNumber: string; nagadNumber: string };
  tracking: { metaPixelId: string; ga4Id: string; gtmId: string; tiktokPixelId: string };
  smsTemplates: Record<string, string>;
  loyalty: { pointsPerTaka: number; takaPerPoint: number };
  lowStockThreshold: number;
  maintenanceMode: boolean;
};

export function SettingsPage() {
  const L = useL();
  const { state, set } = useUrlState();
  const tab = state.tab ?? 'store';
  const { data, reload } = useAdmin<S>('/admin/settings');
  const [s, setS] = useState<S | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return <DashboardSk />;
  const up = <K extends keyof S>(k: K, v: Partial<S[K]> | S[K]) => setS({ ...s, [k]: typeof v === 'object' && !Array.isArray(v) ? { ...(s[k] as object), ...v } : v });
  const save = async () => {
    setBusy(true);
    try {
      const { store, delivery, payments, tracking, smsTemplates, loyalty, lowStockThreshold, maintenanceMode } = s;
      await apiFetch('/admin/settings', { admin: true, method: 'PUT', body: { store, delivery, payments, tracking, smsTemplates, loyalty, lowStockThreshold, maintenanceMode } });
      toast.success(L('Settings saved', 'সেটিংস সেভ হয়েছে'));
      reload();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); } finally { setBusy(false); }
  };
  const txt = (k: keyof S['store'], label: string) => <F label={label}><input value={s.store[k]} onChange={(e) => up('store', { [k]: e.target.value })} className="field" /></F>;
  const numF = (k: keyof S['delivery'], label: string) => <F label={label}><input type="number" min={0} value={s.delivery[k] as number} onChange={(e) => up('delivery', { [k]: Number(e.target.value) })} className="field" /></F>;
  return (
    <div className="pb-20">
      <PageHead title={L('Settings', 'সেটিংস')} actions={<button onClick={save} disabled={busy} className="btn-primary !min-h-10">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{L('Save settings', 'সেটিংস সেভ')}</button>} />
      <Tabs value={tab} onChange={(v) => set({ tab: v === 'store' ? undefined : v })} tabs={[
        { id: 'store', label: <span className="flex items-center gap-1.5"><Store className="h-4 w-4" />{L('Store', 'স্টোর')}</span> },
        { id: 'delivery', label: <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" />{L('Delivery', 'ডেলিভারি')}</span> },
        { id: 'payments', label: <span className="flex items-center gap-1.5"><CreditCard className="h-4 w-4" />{L('Payments & OTP', 'পেমেন্ট ও OTP')}</span> },
        { id: 'tracking', label: <span className="flex items-center gap-1.5"><Radar className="h-4 w-4" />{L('Pixel & analytics', 'পিক্সেল ও অ্যানালিটিক্স')}</span> },
        { id: 'sms', label: <span className="flex items-center gap-1.5"><MessageSquareText className="h-4 w-4" />{L('SMS templates', 'SMS টেমপ্লেট')}</span> },
      ]} />
      <div key={tab} className="animate-page">
        {tab === 'store' && (
          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              {txt('name', L('Store name', 'স্টোরের নাম'))}{txt('email', 'Email')}{txt('phone', L('Phone', 'ফোন'))}{txt('whatsapp', 'WhatsApp')}
              <div className="sm:col-span-2">{txt('address', L('Address', 'ঠিকানা'))}</div>
              {txt('facebook', 'Facebook URL')}{txt('instagram', 'Instagram URL')}{txt('youtube', 'YouTube URL')}
              <F label={L('Low-stock threshold', 'কম স্টকের সীমা')}><input type="number" min={0} value={s.lowStockThreshold} onChange={(e) => setS({ ...s, lowStockThreshold: Number(e.target.value) })} className="field" /></F>
              <F label={L('Loyalty: points per ৳', 'লয়্যালটি: প্রতি ৳-এ পয়েন্ট')}><input type="number" step="0.01" min={0} max={1} value={s.loyalty.pointsPerTaka} onChange={(e) => up('loyalty', { pointsPerTaka: Number(e.target.value) })} className="field" /></F>
              <F label={L('Loyalty: ৳ per point', 'লয়্যালটি: প্রতি পয়েন্টে ৳')}><input type="number" step="0.1" min={0} value={s.loyalty.takaPerPoint} onChange={(e) => up('loyalty', { takaPerPoint: Number(e.target.value) })} className="field" /></F>
              <div className="sm:col-span-2"><Toggle label={L('Maintenance mode (store shows a notice)', 'মেইনটেন্যান্স মোড')} checked={s.maintenanceMode} onChange={(v) => setS({ ...s, maintenanceMode: v })} /></div>
            </div>
          </Panel>
        )}
        {tab === 'delivery' && (
          <Panel>
            <div className="grid gap-4 sm:grid-cols-3">
              {numF('insideDhaka', L('Inside Dhaka ৳', 'ঢাকার ভেতরে ৳'))}{numF('dhakaSuburb', L('Dhaka suburb ৳', 'ঢাকার আশপাশ ৳'))}{numF('outsideDhaka', L('Outside Dhaka ৳', 'ঢাকার বাইরে ৳'))}
              {numF('freeShippingThreshold', L('Free delivery over ৳', 'এর বেশি হলে ফ্রি ৳'))}{numF('giftWrapFee', L('Gift wrap ৳', 'গিফট র‍্যাপ ৳'))}<span />
              <F label={L('Inside Dhaka days', 'ঢাকায় দিন')}><input value={s.delivery.insideDays} onChange={(e) => up('delivery', { insideDays: e.target.value })} className="field" /></F>
              <F label={L('Outside Dhaka days', 'ঢাকার বাইরে দিন')}><input value={s.delivery.outsideDays} onChange={(e) => up('delivery', { outsideDays: e.target.value })} className="field" /></F>
            </div>
          </Panel>
        )}
        {tab === 'payments' && (
          <Panel>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label={L('Cash on delivery', 'ক্যাশ অন ডেলিভারি')} checked={s.payments.cod} onChange={(v) => up('payments', { cod: v })} />
              <Toggle label={L('Require OTP for COD (fake-order shield)', 'COD-তে OTP বাধ্যতামূলক (ফেক অর্ডার রোধ)')} checked={s.payments.codOtpRequired} onChange={(v) => up('payments', { codOtpRequired: v })} />
              <Toggle label={L('Collect delivery charge in advance for COD', 'COD-তে ডেলিভারি চার্জ অগ্রিম')} checked={s.payments.codAdvanceDeliveryCharge} onChange={(v) => up('payments', { codAdvanceDeliveryCharge: v })} />
              <Toggle label={L('bKash gateway', 'বিকাশ গেটওয়ে')} checked={s.payments.bkash} onChange={(v) => up('payments', { bkash: v })} />
              <Toggle label="SSLCommerz (cards)" checked={s.payments.sslcommerz} onChange={(v) => up('payments', { sslcommerz: v })} />
              <Toggle label={L('bKash Send Money (manual)', 'বিকাশ সেন্ড মানি (ম্যানুয়াল)')} checked={s.payments.bkashManual} onChange={(v) => up('payments', { bkashManual: v })} />
              <Toggle label={L('Nagad Send Money (manual)', 'নগদ সেন্ড মানি (ম্যানুয়াল)')} checked={s.payments.nagadManual} onChange={(v) => up('payments', { nagadManual: v })} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <F label={L('bKash merchant number', 'বিকাশ নম্বর')}><input value={s.payments.bkashNumber} onChange={(e) => up('payments', { bkashNumber: e.target.value })} className="field font-mono" /></F>
              <F label={L('Nagad merchant number', 'নগদ নম্বর')}><input value={s.payments.nagadNumber} onChange={(e) => up('payments', { nagadNumber: e.target.value })} className="field font-mono" /></F>
            </div>
            <p className="mt-4 rounded-xl bg-sand p-3 text-xs text-mocha">{L('Gateway API keys (bKash, SSLCommerz), courier keys and SMS gateway keys live only in the server .env — never in the database or the browser.', 'গেটওয়ে API কী (বিকাশ, SSLCommerz), কুরিয়ার কী ও SMS গেটওয়ে কী শুধু সার্ভারের .env-এ থাকে — ডেটাবেস বা ব্রাউজারে কখনো নয়।')}</p>
          </Panel>
        )}
        {tab === 'tracking' && (
          <Panel>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Meta Pixel ID" hint={L('Digits only. Conversions API token goes in the server .env.', 'শুধু সংখ্যা। কনভার্সন API টোকেন সার্ভারের .env-এ।')}><input value={s.tracking.metaPixelId} onChange={(e) => up('tracking', { metaPixelId: e.target.value.replace(/\D/g, '') })} className="field font-mono" /></F>
              <F label="GA4 Measurement ID"><input value={s.tracking.ga4Id} onChange={(e) => up('tracking', { ga4Id: e.target.value })} placeholder="G-XXXXXXX" className="field font-mono" /></F>
              <F label="GTM ID"><input value={s.tracking.gtmId} onChange={(e) => up('tracking', { gtmId: e.target.value })} placeholder="GTM-XXXX" className="field font-mono" /></F>
              <F label="TikTok Pixel ID"><input value={s.tracking.tiktokPixelId} onChange={(e) => up('tracking', { tiktokPixelId: e.target.value })} className="field font-mono" /></F>
            </div>
          </Panel>
        )}
        {tab === 'sms' && (
          <Panel>
            <p className="mb-4 text-xs text-mocha">{L('Placeholders: {name} {orderNo} {total} {courier} {trackingUrl} {code} {product} …', 'প্লেসহোল্ডার: {name} {orderNo} {total} {courier} {trackingUrl} {code} {product} …')}</p>
            <div className="space-y-3">
              {Object.entries(s.smsTemplates).map(([k, v]) => (
                <F key={k} label={`${k} · ${v.length}`}><textarea rows={2} maxLength={480} value={v} onChange={(e) => up('smsTemplates', { ...s.smsTemplates, [k]: e.target.value })} className="field text-sm" /></F>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

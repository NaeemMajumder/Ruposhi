'use client';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BadgeDollarSign, CreditCard, MessageSquare, Percent, ShoppingBag, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import { useT } from '@/i18n/client';
import { dateFmt, money, num } from '@/lib/format';
import { DashboardSk } from '../../ui/Skeletons';
import { BarList, Columns, Donut, Funnel, TrendChart } from '../charts';
import { lbl } from '../labels';
import { daysAgo, useAdmin, useL, useUrlState } from '../lib';
import { Badge, DateRange, ErrorBox, ExportButton, Kpi, PageHead, Panel, Tabs } from '../ui';
import { useState } from 'react';

type KV = { name: string; value: number };
type Dash = {
  range: { from: string; to: string };
  kpis: Record<'revenue' | 'orders' | 'aov' | 'profit' | 'conversion' | 'newCustomers' | 'returnRate' | 'cancelRate', { value: number; change: number | null }>;
  series: { date: string; revenue: number; orders: number; profit: number }[];
  statusBreakdown: KV[]; paymentBreakdown: KV[]; categoryBreakdown: KV[]; channelBreakdown: KV[]; districtBreakdown: KV[];
  funnel: { step: string; value: number }[];
  topProducts: { slug: string; name: string; image?: string; revenue: number; qty: number }[];
  lowStock: { slug: string; name: string; sku: string; size: string; color: string; stock: number }[];
  tasks: { pendingOrders: number; pendingPayments: number; newReviews: number; highRisk: number };
  recentOrders: { _id: string; orderNo: string; customer: string; total: number; status: string; payment: string; createdAt: string }[];
};

export function Dashboard() {
  const { lang } = useT();
  const L = useL();
  const { state, set } = useUrlState();
  const from = state.from ?? daysAgo(29);
  const to = state.to ?? daysAgo(0);
  const q = `from=${from}&to=${to}`;
  const { data: d, error, loading, reload } = useAdmin<Dash>(`/admin/dashboard?${q}`);
  const [trend, setTrend] = useState<'revenue' | 'profit'>('revenue');
  const m = (n: number) => money(Math.round(n), lang);
  const n = (x: number) => num(Math.round(x), lang);
  const label = (s: string) => lbl(s, lang);

  return (
    <div>
      <PageHead
        title={L('Dashboard', 'ড্যাশবোর্ড')}
        sub={d ? `${dateFmt(d.range.from, lang)} — ${dateFmt(d.range.to, lang)} · ${L('compared with the previous period', 'আগের সময়ের তুলনায়')}` : undefined}
        actions={<><DateRange from={from} to={to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} /><ExportButton path={`/admin/dashboard/export?${q}`} /></>}
      />
      {error && !d ? <ErrorBox msg={error.message} onRetry={reload} /> : !d ? <DashboardSk /> : (
        <div className={loading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
          {/* tasks */}
          {(d.tasks.pendingOrders + d.tasks.pendingPayments + d.tasks.newReviews + d.tasks.highRisk) > 0 && (
            <div className="stagger mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {[
                { n: d.tasks.pendingOrders, en: 'orders to confirm', bn: 'অর্ডার কনফার্ম বাকি', href: '/admin/orders?status=pending', icon: ShoppingBag },
                { n: d.tasks.pendingPayments, en: 'payments to verify', bn: 'পেমেন্ট যাচাই বাকি', href: '/admin/orders?paymentStatus=pending_verification', icon: Wallet },
                { n: d.tasks.newReviews, en: 'reviews to moderate', bn: 'রিভিউ মডারেশন', href: '/admin/reviews?status=pending', icon: MessageSquare },
                { n: d.tasks.highRisk, en: 'high-risk orders', bn: 'ঝুঁকিপূর্ণ অর্ডার', href: '/admin/orders?risk=high', icon: AlertTriangle },
              ].filter((x) => x.n > 0).map((x) => (
                <Link key={x.en} href={x.href} className="group flex items-center gap-2.5 rounded-2xl border border-gold/40 bg-gold/10 px-3.5 py-2.5 text-sm transition hover:border-gold hover:bg-gold/20">
                  <x.icon className="h-4 w-4 text-bronze" /><b className="tabular-nums">{n(x.n)}</b><span className="text-mocha">{L(x.en, x.bn)}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}

          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label={L('Revenue', 'আয়')} value={d.kpis.revenue.value} change={d.kpis.revenue.change} format={m} icon={BadgeDollarSign} />
            <Kpi label={L('Orders', 'অর্ডার')} value={d.kpis.orders.value} change={d.kpis.orders.change} format={n} icon={ShoppingBag} />
            <Kpi label={L('Avg. order value', 'গড় অর্ডার মূল্য')} value={d.kpis.aov.value} change={d.kpis.aov.change} format={m} icon={CreditCard} />
            <Kpi label={L('Gross profit', 'মোট লাভ')} value={d.kpis.profit.value} change={d.kpis.profit.change} format={m} icon={TrendingUp} />
            <Kpi label={L('Conversion rate', 'কনভার্সন রেট')} value={d.kpis.conversion.value} change={d.kpis.conversion.change} format={(x) => `${x.toFixed(2)}%`} icon={Percent} />
            <Kpi label={L('New customers', 'নতুন কাস্টমার')} value={d.kpis.newCustomers?.value ?? 0} change={d.kpis.newCustomers?.change} format={n} icon={UserPlus} />
            <Kpi label={L('Return rate', 'রিটার্ন রেট')} value={d.kpis.returnRate?.value ?? 0} change={d.kpis.returnRate?.change != null ? -d.kpis.returnRate.change : null} format={(x) => `${x.toFixed(1)}%`} />
            <Kpi label={L('Cancel rate', 'বাতিলের হার')} value={d.kpis.cancelRate?.value ?? 0} change={d.kpis.cancelRate?.change != null ? -d.kpis.cancelRate.change : null} format={(x) => `${x.toFixed(1)}%`} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title={<Tabs tabs={[{ id: 'revenue', label: L('Revenue', 'আয়') }, { id: 'profit', label: L('Profit', 'লাভ') }]} value={trend} onChange={(v) => setTrend(v as 'revenue' | 'profit')} />} bodyClass="pt-0">
              <TrendChart key={trend} data={d.series} dataKey={trend} name={trend === 'revenue' ? L('Revenue', 'আয়') : L('Profit', 'লাভ')} fmt={m} slot={trend === 'revenue' ? 0 : 2} height={280} />
            </Panel>
            <Panel title={L('Orders per day', 'দৈনিক অর্ডার')}>
              <Columns data={d.series} dataKey="orders" name={L('Orders', 'অর্ডার')} fmt={n} height={280} />
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title={L('Revenue by payment method', 'পেমেন্ট মেথড অনুযায়ী আয়')}>
              <Donut data={d.paymentBreakdown} fmt={m} label={label} otherLabel={L('Other', 'অন্যান্য')} center={<div><p className="font-display text-xl">{m(d.kpis.revenue.value)}</p><p className="text-[11px] text-mocha">{L('total', 'মোট')}</p></div>} />
            </Panel>
            <Panel title={L('Revenue by category', 'ক্যাটাগরি অনুযায়ী আয়')}>
              <Donut data={d.categoryBreakdown} fmt={m} label={label} otherLabel={L('Other', 'অন্যান্য')} center={<p className="text-xs text-mocha">{n(d.categoryBreakdown.length)} {L('categories', 'ক্যাটাগরি')}</p>} />
            </Panel>
            <Panel title={L('Sales channel (UTM)', 'বিক্রির চ্যানেল (UTM)')}>
              <Donut data={d.channelBreakdown} fmt={m} label={label} otherLabel={L('Other', 'অন্যান্য')} center={<p className="text-xs text-mocha">{L('first-party', 'ফার্স্ট-পার্টি')}</p>} />
            </Panel>
            <Panel title={L('Order status', 'অর্ডার স্ট্যাটাস')} action={<Link href="/admin/orders" className="btn-link text-xs">{L('All orders', 'সব অর্ডার')}</Link>}>
              <ul className="space-y-2">
                {d.statusBreakdown.map((s) => {
                  const total = d.statusBreakdown.reduce((a, b) => a + b.value, 0) || 1;
                  return (
                    <li key={s.name}>
                      <Link href={`/admin/orders?status=${s.name}&from=${from}&to=${to}`} className="flex items-center gap-3 rounded-lg px-1 py-1 text-sm hover:bg-sand">
                        <Badge v={s.name} label={label(s.name)} />
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand"><span className="block h-full origin-left rounded-full bg-mocha/50" style={{ width: `${(s.value / total) * 100}%`, animation: 'progress .9s var(--ease-silk) both' }} /></span>
                        <span className="w-8 text-right tabular-nums">{n(s.value)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel title={L('Top districts', 'শীর্ষ জেলা')}>
              <BarList data={d.districtBreakdown} fmt={m} max={7} slot={1} />
            </Panel>
            <Panel title={L('Conversion funnel', 'কনভার্সন ফানেল')}>
              <Funnel data={d.funnel.map((f) => ({ ...f, step: lang === 'bn' ? ({ Sessions: 'সেশন', 'Product views': 'প্রোডাক্ট ভিউ', 'Add to cart': 'কার্টে যোগ', Checkout: 'চেকআউট', Orders: 'অর্ডার' } as Record<string, string>)[f.step] ?? f.step : f.step }))} fmt={n} />
            </Panel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Panel className="xl:col-span-2" title={L('Recent orders', 'সাম্প্রতিক অর্ডার')} action={<Link href="/admin/orders" className="btn-link text-xs">{L('View all', 'সব দেখুন')}</Link>} bodyClass="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <tbody>
                    {d.recentOrders.map((o, i) => (
                      <tr key={o._id} className="border-t border-line first:border-0 hover:bg-blush" style={{ animation: `fade .4s ease ${i * 40}ms both` }}>
                        <td className="px-5 py-3"><Link href={`/admin/orders/${o._id}`} className="font-mono text-xs font-semibold hover:text-bronze">{o.orderNo}</Link><p className="text-xs text-mocha">{dateFmt(o.createdAt, lang, true)}</p></td>
                        <td className="px-3 py-3">{o.customer}</td>
                        <td className="px-3 py-3 text-xs text-mocha">{label(o.payment)}</td>
                        <td className="px-3 py-3"><Badge v={o.status} label={label(o.status)} /></td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums">{m(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <div className="space-y-4">
              <Panel title={L('Top products', 'শীর্ষ প্রোডাক্ট')}>
                <ul className="space-y-3">
                  {d.topProducts.slice(0, 5).map((p, i) => (
                    <li key={p.slug} className="flex items-center gap-3" style={{ animation: `rise .5s var(--ease-silk) ${i * 60}ms both` }}>
                      <span className="w-4 text-xs font-bold text-mocha">{i + 1}</span>
                      <span className="media relative h-11 w-9 shrink-0 overflow-hidden rounded-lg">{p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{p.name}</span><span className="text-xs text-mocha">{n(p.qty)} {L('sold', 'বিক্রি')}</span></span>
                      <span className="text-sm font-semibold tabular-nums">{m(p.revenue)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title={L('Low stock', 'স্টক কম')} action={<Link href="/admin/inventory?stock=low,out" className="btn-link text-xs">{L('Inventory', 'ইনভেন্টরি')}</Link>}>
                <ul className="space-y-2 text-sm">
                  {d.lowStock.slice(0, 6).map((s) => (
                    <li key={s.sku} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{s.name} <span className="text-xs text-mocha">· {s.size}</span></span>
                      <Badge v={s.stock === 0 ? 'out' : 'medium'} label={s.stock === 0 ? L('Out', 'শেষ') : `${n(s.stock)} ${L('left', 'বাকি')}`} />
                    </li>
                  ))}
                  {d.lowStock.length === 0 && <li className="text-mocha">{L('All stocked up', 'সব স্টকে আছে')}</li>}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

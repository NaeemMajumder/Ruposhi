'use client';
import { useT } from '@/i18n/client';
import { money, num, titleCase } from '@/lib/format';
import { DashboardSk } from '../../ui/Skeletons';
import { Columns, Donut, GroupedBars } from '../charts';
import { lbl } from '../labels';
import { daysAgo, useAdmin, useClientPage, useL, useUrlState } from '../lib';
import { DateRange, ErrorBox, ExportButton, FSelect, PageHead, Pager, Panel } from '../ui';

type Rep = { columns: string[]; rows: Record<string, string | number>[]; chart: { x?: string; bars?: string[]; line?: string; limit?: number; pie?: string; label?: string; pieData?: { name: string; value: number }[] } };
const TYPES: [string, string, string][] = [
  ['sales', 'Sales', 'বিক্রি'], ['profit', 'Profit', 'লাভ'], ['products', 'Products', 'প্রোডাক্ট'], ['categories', 'Categories', 'ক্যাটাগরি'], ['payments', 'Payments', 'পেমেন্ট'],
  ['districts', 'Districts', 'জেলা'], ['channels', 'Channels / UTM', 'চ্যানেল / UTM'], ['couriers', 'Couriers', 'কুরিয়ার'], ['coupons', 'Coupons', 'কুপন'], ['customers', 'Customers (RFM)', 'কাস্টমার'],
];
const MONEY = new Set(['gross', 'discount', 'delivery', 'revenue', 'aov', 'profit', 'cost', 'grossProfit', 'paid_amount', 'discountGiven', 'codCollected', 'spent']);

export function Reports() {
  const { lang } = useT();
  const L = useL();
  const { state, set } = useUrlState();
  const type = state.type ?? 'sales';
  const from = state.from ?? daysAgo(29);
  const to = state.to ?? daysAgo(0);
  const q = `from=${from}&to=${to}${state.groupBy ? `&groupBy=${state.groupBy}` : ''}`;
  const { data, error, loading, reload } = useAdmin<Rep>(`/admin/reports/${type}?${q}`);
  // charts use every row; the table below shows 15 per page (Excel export still has everything)
  const pg = useClientPage(data?.rows);
  const fmtCell = (k: string, v: string | number) => (typeof v === 'number' ? (MONEY.has(k) ? money(v, lang) : num(v, lang)) : ['category', 'method', 'channel', 'courier'].includes(k) ? lbl(String(v), lang) : v);
  const fmtMoney = (n: number) => money(Math.round(n), lang);
  const ch = data?.chart;
  const isMoney = ch?.bars?.every((b) => MONEY.has(b)) ?? true;

  return (
    <div>
      <PageHead title={L('Reports', 'রিপোর্ট')} actions={<><DateRange from={from} to={to} onChange={(f, t) => set({ from: f || undefined, to: t || undefined })} />{['sales', 'profit'].includes(type) && <FSelect label={L('Group by day', 'দিন অনুযায়ী')} value={state.groupBy ?? ''} onChange={(v) => set({ groupBy: v || undefined })} options={[{ value: 'week', label: L('Week', 'সপ্তাহ') }, { value: 'month', label: L('Month', 'মাস') }]} />}<ExportButton path={`/admin/reports/${type}/export?${q}`} /></>} />
      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto pb-1">
        {TYPES.map(([id, en, bn]) => <button key={id} onClick={() => set({ type: id === 'sales' ? undefined : id, groupBy: undefined })} className={`chip shrink-0 ${type === id ? 'chip-on' : ''}`}>{L(en, bn)}</button>)}
      </div>
      {error && !data ? <ErrorBox msg={error.message} onRetry={reload} /> : !data || !ch ? <DashboardSk /> : (
        <div key={type} className={`space-y-4 ${loading ? 'opacity-60' : ''} transition-opacity`}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel className={ch.line ? 'xl:col-span-2' : 'xl:col-span-3'} title={L('Chart', 'চার্ট')}>
              {ch.pie || ch.pieData ? (
                <div className="mx-auto max-w-xl"><Donut data={ch.pieData ?? data.rows.map((r) => ({ name: String(r[ch.label!]), value: Number(r[ch.pie!]) }))} fmt={ch.pieData ? (n) => num(n, lang) : fmtMoney} label={(s) => lbl(s, lang)} otherLabel={L('Other', 'অন্যান্য')} /></div>
              ) : ch.bars && ch.x ? (
                <GroupedBars data={data.rows.slice(0, ch.limit ?? 60)} x={ch.x} keys={ch.bars} names={ch.bars.map((b) => titleCase(b.replace(/([A-Z])/g, ' $1')))} fmt={isMoney ? fmtMoney : (n) => num(n, lang)} horizontal={['product', 'district'].includes(ch.x)} height={['product', 'district'].includes(ch.x) ? Math.max(260, Math.min(data.rows.length, ch.limit ?? 12) * 30) : 300} />
              ) : null}
            </Panel>
            {ch.line && ch.x && (
              <Panel title={titleCase(ch.line)}><Columns data={data.rows} xKey={ch.x} dataKey={ch.line} name={titleCase(ch.line)} fmt={(n) => num(n, lang)} height={300} /></Panel>
            )}
          </div>
          <Panel title={`${L('Data', 'ডেটা')} · ${num(data.rows.length, lang)} ${L('rows', 'সারি')}`} bodyClass="p-0">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-sand text-left text-xs uppercase tracking-wider text-mocha"><tr>{data.columns.map((c) => <th key={c} className="whitespace-nowrap px-4 py-3">{titleCase(c.replace(/([A-Z])/g, ' $1'))}</th>)}</tr></thead>
                <tbody>
                  {pg.rows!.map((r, i) => <tr key={i} className="border-t border-line hover:bg-blush" style={{ animation: `fade .3s ease ${Math.min(i, 20) * 15}ms both` }}>{data.columns.map((c) => <td key={c} className={`whitespace-nowrap px-4 py-2.5 ${typeof r[c] === 'number' ? 'text-right tabular-nums' : ''}`}>{fmtCell(c, r[c])}</td>)}</tr>)}
                  {data.rows.length === 0 && <tr><td colSpan={data.columns.length} className="px-4 py-12 text-center text-mocha">{L('No data in this range', 'এই সময়ে ডেটা নেই')}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4"><Pager {...pg.pager} /></div>
          </Panel>
        </div>
      )}
    </div>
  );
}

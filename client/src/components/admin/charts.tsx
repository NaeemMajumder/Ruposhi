'use client';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useIsDark } from '@/theme/ThemeToggle';
import { cn } from '@/lib/format';

/**
 * Categorical palette — brand-tinted, VALIDATED with the dataviz validator in both modes
 * (adjacent CVD ΔE ≥ 8.7 light / 9.8 dark, normal-vision ≥ 17.4, dark lightness band OK).
 * Order is the safety mechanism: assign in this order, never cycle; >6 categories fold into "Other".
 * Slot 4 (yellow) is < 3:1 on white → every chart here ships visible labels/values (relief rule).
 */
const SERIES = {
  light: ['#b26b2a', '#2f6fb0', '#1f9a7a', '#c99a1f', '#a83e5c', '#6a55c9'],
  dark: ['#bf7634', '#4785d6', '#169474', '#b88a10', '#d0607f', '#8a7ae6'],
};
/** ordinal ramp (funnel steps) — one hue, light → dark */
const ORDINAL = { light: ['#e3b98f', '#cf9a63', '#b26b2a', '#8c5220', '#643a15'], dark: ['#5d3a1b', '#80502a', '#a86b39', '#cf8f55', '#ecb985'] };

function useChartTheme() {
  const dark = useIsDark();
  const [ink, setInk] = useState({ text: '#6b4e3d', grid: '#e6d3bf', surface: '#ffffff', strong: '#2c1810' });
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const g = (v: string) => cs.getPropertyValue(v).trim();
    setInk({ text: g('--color-mocha'), grid: g('--color-line'), surface: g('--color-surface'), strong: g('--color-espresso') });
  }, [dark]);
  return { dark, ink, series: dark ? SERIES.dark : SERIES.light, ordinal: dark ? ORDINAL.dark : ORDINAL.light };
}

function Tip({ active, payload, label, fmt, labelFmt }: { active?: boolean; payload?: { value: number; name: string; color?: string; payload?: Record<string, unknown> }[]; label?: string; fmt: (n: number) => string; labelFmt?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      {label != null && <p className="mb-1 font-semibold">{labelFmt ? labelFmt(String(label)) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 tabular-nums text-espresso">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.name}: <b>{fmt(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

const shortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${Number(day)}/${Number(m)}`;
};

/** Single-series trend (area). One measure per chart — never a dual axis. */
export function TrendChart({ data, dataKey, name, fmt, height = 260, slot = 0 }: { data: Record<string, number | string>[]; dataKey: string; name: string; fmt: (n: number) => string; height?: number; slot?: number }) {
  const { ink, series } = useChartTheme();
  const c = series[slot];
  const id = `g-${dataKey}-${slot}`;
  return (
    <div style={{ height }} role="img" aria-label={`${name} trend`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={ink.grid} strokeDasharray="3 4" />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip content={<Tip fmt={fmt} />} cursor={{ stroke: ink.text, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke={c} strokeWidth={2} fill={`url(#${id})`} activeDot={{ r: 5, stroke: ink.surface, strokeWidth: 2 }} animationDuration={900} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Vertical columns, single series (e.g. orders per day). */
export function Columns({ data, dataKey, name, fmt, height = 220, slot = 1, xKey = 'date' }: { data: Record<string, number | string>[]; dataKey: string; name: string; fmt: (n: number) => string; height?: number; slot?: number; xKey?: string }) {
  const { ink, series } = useChartTheme();
  return (
    <div style={{ height }} role="img" aria-label={name}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke={ink.grid} strokeDasharray="3 4" />
          <XAxis dataKey={xKey} tickFormatter={xKey === 'date' ? shortDate : undefined} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
          <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
          <Tooltip content={<Tip fmt={fmt} />} cursor={{ fill: ink.grid, opacity: 0.4 }} />
          <Bar dataKey={dataKey} name={name} fill={series[slot]} radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut for part-to-whole (≤ 6 segments, tail folded into "Other"), with a labelled legend + % (identity never colour-alone). */
export function Donut({ data, fmt, label, center, otherLabel = 'Other' }: { data: { name: string; value: number }[]; fmt: (n: number) => string; label: (n: string) => string; center?: React.ReactNode; otherLabel?: string }) {
  const { ink, series } = useChartTheme();
  const rows = useMemo(() => {
    const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    if (sorted.length <= 6) return sorted.map((d) => ({ ...d, label: label(d.name) }));
    const head = sorted.slice(0, 5).map((d) => ({ ...d, label: label(d.name) }));
    const tail = sorted.slice(5).reduce((s, d) => s + d.value, 0);
    return [...head, { name: '__other', label: otherLabel, value: tail }];
  }, [data, label, otherLabel]);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="@container"><div className="grid items-center gap-4 @md:grid-cols-[180px_1fr]">
      <div className="relative mx-auto h-[180px] w-[180px]" role="img" aria-label="Breakdown chart">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius={58} outerRadius={84} paddingAngle={1.5} stroke={ink.surface} strokeWidth={2} animationDuration={900} onMouseLeave={() => setHover(null)} onMouseEnter={(_, i) => setHover(i)}>
              {rows.map((r, i) => <Cell key={r.name} fill={series[i]} opacity={hover == null || hover === i ? 1 : 0.35} style={{ transition: 'opacity .25s' }} />)}
            </Pie>
            <Tooltip content={<Tip fmt={fmt} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          {hover != null && rows[hover] ? (
            <div className="animate-fade"><p className="font-display text-2xl leading-none">{Math.round((rows[hover].value / total) * 100)}%</p><p className="mt-1 max-w-[90px] truncate text-[11px] text-mocha">{rows[hover].label}</p></div>
          ) : center}
        </div>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors', hover === i && 'bg-sand')}>
            <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: series[i] }} />
            <span className="min-w-0 flex-1 truncate text-espresso">{r.label}</span>
            <span className="tabular-nums text-espresso">{fmt(r.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-mocha">{total ? Math.round((r.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div></div>
  );
}

/** Ranked horizontal bars (single colour — the length encodes value). */
export function BarList({ data, fmt, label = (s) => s, max = 8, slot = 0 }: { data: { name: string; value: number; sub?: string }[]; fmt: (n: number) => string; label?: (s: string) => string; max?: number; slot?: number }) {
  const { series } = useChartTheme();
  const rows = [...data].sort((a, b) => b.value - a.value).slice(0, max);
  const top = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.name} className="group" title={`${label(r.name)}: ${fmt(r.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate capitalize text-espresso">{label(r.name)}{r.sub && <span className="ml-1.5 text-xs text-mocha">{r.sub}</span>}</span>
            <span className="tabular-nums text-espresso">{fmt(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-sand">
            <div className="h-full origin-left rounded-full transition-[filter] group-hover:brightness-110" style={{ width: `${(r.value / top) * 100}%`, background: series[slot], animation: `progress .9s var(--ease-silk) ${i * 60}ms both` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Funnel: ordered stages → ordinal ramp + step conversion. */
export function Funnel({ data, fmt }: { data: { step: string; value: number }[]; fmt: (n: number) => string }) {
  const { ordinal } = useChartTheme();
  const top = Math.max(1, data[0]?.value ?? 1);
  return (
    <ol className="space-y-2">
      {data.map((d, i) => {
        const prev = i > 0 ? data[i - 1].value : null;
        const conv = prev ? (d.value / prev) * 100 : null;
        return (
          <li key={d.step} className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate text-mocha">{d.step}</span>
            <div className="h-7 overflow-hidden rounded-lg bg-sand">
              <div className="flex h-full origin-left items-center rounded-lg px-2 text-[11px] font-semibold text-night" style={{ width: `${Math.max(4, (d.value / top) * 100)}%`, background: ordinal[Math.min(i, ordinal.length - 1)], animation: `progress 1s var(--ease-silk) ${i * 90}ms both` }} />
            </div>
            <span className="w-24 text-right tabular-nums">{fmt(d.value)}{conv != null && <span className="ml-1 text-xs text-mocha">{conv.toFixed(conv < 10 ? 1 : 0)}%</span>}</span>
          </li>
        );
      })}
    </ol>
  );
}

export const compact = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : String(n));

/** Grouped bars — 1–3 measures of the SAME unit on one axis (never mixes units). Legend always shown for ≥ 2. */
export function GroupedBars({ data, x, keys, names, fmt, height = 300, horizontal }: { data: Record<string, number | string>[]; x: string; keys: string[]; names: string[]; fmt: (n: number) => string; height?: number; horizontal?: boolean }) {
  const { ink, series } = useChartTheme();
  return (
    <div>
      {keys.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs">
          {keys.map((k, i) => <span key={k} className="flex items-center gap-1.5 text-espresso"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: series[i] }} />{names[i]}</span>)}
        </div>
      )}
      <div style={{ height }} role="img" aria-label={names.join(', ')}>
        <ResponsiveContainer>
          <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid horizontal={!horizontal} vertical={!!horizontal} stroke={ink.grid} strokeDasharray="3 4" />
            {horizontal ? (
              <>
                <XAxis type="number" tickFormatter={(v) => compact(v)} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey={x} width={150} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
              </>
            ) : (
              <>
                <XAxis dataKey={x} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? shortDate(v) : v)} minTickGap={16} />
                <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: ink.text, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              </>
            )}
            <Tooltip content={<Tip fmt={fmt} />} cursor={{ fill: ink.grid, opacity: 0.35 }} />
            {keys.map((k, i) => <Bar key={k} dataKey={k} name={names[i]} fill={series[i]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 18 : 32} stroke={ink.surface} strokeWidth={1} animationDuration={800} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

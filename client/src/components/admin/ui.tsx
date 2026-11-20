'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Inbox, Loader2, Search, Upload, X } from 'lucide-react';
import { useT } from '@/i18n/client';
import { downloadFile } from '@/lib/client-api';
import { cn, num } from '@/lib/format';
import { toast } from '../ui/Toast';
import { CountUp } from '../ui/CountUp';
import { Sk } from '../ui/Skeletons';
import { PAGE_SIZE, PRESETS, useDebounced, useL } from './lib';

/* ───────────── layout ───────────── */
export function PageHead({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="animate-rise">
        <h1 className="font-display text-[34px] leading-none sm:text-[42px]">{title}</h1>
        {sub && <p className="mt-2 text-sm text-mocha">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 animate-fade">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClass }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn('card min-w-0 animate-scale-in overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          {typeof title === 'string' ? <h2 className="text-sm font-semibold">{title}</h2> : title}
          {action}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, change, format, icon: Icon, loading, hint }: { label: string; value: number; change?: number | null; format: (n: number) => string; icon?: React.ComponentType<{ className?: string }>; loading?: boolean; hint?: string }) {
  const up = (change ?? 0) >= 0;
  return (
    <div className="card lift group relative overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-mocha">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-bronze transition-transform duration-500 group-hover:scale-125" />}
      </div>
      {loading ? <Sk className="mt-3 h-8 w-28" /> : <p className="mt-2 font-display text-[28px] leading-tight sm:text-[32px]"><CountUp key={value} value={value} format={format} duration={900} /></p>}
      <div className="mt-1 flex items-center gap-2 text-xs">
        {change != null && !loading && (
          <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold', up ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger')}>
            {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(change)}%
          </span>
        )}
        {hint && <span className="text-mocha">{hint}</span>}
      </div>
    </div>
  );
}

/* ───────────── status badges (status = icon-free text + tone; never colour alone) ───────────── */
const TONE: Record<string, string> = {
  pending: 'bg-gold/20 text-bronze', confirmed: 'bg-[#2f6fb0]/15 text-[#2f6fb0] dark:text-[#7fb0ec]', processing: 'bg-[#6a55c9]/15 text-[#6a55c9] dark:text-[#b0a5f0]',
  shipped: 'bg-[#1f9a7a]/15 text-[#16785f] dark:text-[#5fd1b0]', delivered: 'bg-success/15 text-success', cancelled: 'bg-danger/12 text-danger', returned: 'bg-maroon/12 text-maroon',
  paid: 'bg-success/15 text-success', unpaid: 'bg-sand text-mocha', pending_verification: 'bg-gold/20 text-bronze', partial: 'bg-gold/20 text-bronze', refunded: 'bg-maroon/12 text-maroon', failed: 'bg-danger/12 text-danger',
  active: 'bg-success/15 text-success', draft: 'bg-sand text-mocha', archived: 'bg-line text-mocha', approved: 'bg-success/15 text-success', hidden: 'bg-line text-mocha',
  high: 'bg-danger/12 text-danger', medium: 'bg-gold/20 text-bronze', low: 'bg-success/15 text-success', in: 'bg-success/15 text-success', out: 'bg-danger/12 text-danger',
  new: 'bg-gold/20 text-bronze', read: 'bg-sand text-mocha', replied: 'bg-success/15 text-success', sent: 'bg-success/15 text-success',
};
export function Badge({ v, label }: { v: string; label?: string }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize', TONE[v] ?? 'bg-sand text-espresso')}>{label ?? v.replace(/_/g, ' ')}</span>;
}

/* ───────────── filters ───────────── */
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [v, setV] = useState(value);
  const d = useDebounced(v);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (d !== value) onChange(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  return (
    <label className="relative block w-full min-w-0 sm:w-auto sm:min-w-[240px] sm:flex-none">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mocha" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="field !h-10 !py-0 !pl-10 !pr-9 text-sm" />
      {v && <button type="button" onClick={() => (setV(''), onChange(''))} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full hover:bg-sand" aria-label="Clear"><X className="h-3.5 w-3.5" /></button>}
    </label>
  );
}

export function FSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn('chip !h-10 appearance-none !pr-8 font-medium', value && 'chip-on')}>
        <option value="">{label}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
    </label>
  );
}

/** Multi-select popover (values stored as CSV). */
export function MultiSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = value ? value.split(',') : [];
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const toggle = (v: string) => onChange((sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v]).join(','));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((x) => !x)} className={cn('chip !h-10 font-medium', sel.length > 0 && 'chip-on')} aria-expanded={open}>
        {label}{sel.length > 0 && <span className="rounded-full bg-cream/25 px-1.5 text-[11px]">{sel.length}</span>}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-30 max-h-72 w-56 animate-scale-in overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => toggle(o.value)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-sand">
              <span className={cn('grid h-4 w-4 place-items-center rounded border', sel.includes(o.value) ? 'border-espresso bg-espresso text-cream' : 'border-line')}>{sel.includes(o.value) && <Check className="h-3 w-3" />}</span>
              <span className="capitalize">{o.label}</span>
            </button>
          ))}
          {sel.length > 0 && <button type="button" onClick={() => onChange('')} className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-bronze hover:bg-sand">Clear</button>}
        </div>
      )}
    </div>
  );
}

/** Date range with quick presets + custom from/to. Emits YYYY-MM-DD strings. */
export function DateRange({ from, to, onChange }: { from?: string; to?: string; onChange: (from: string, to: string) => void }) {
  const L = useL();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(from ?? '');
  const [t, setT] = useState(to ?? '');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (setF(from ?? ''), setT(to ?? '')), [from, to]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const active = PRESETS.find((p) => {
    const [a, b] = p.range();
    return a === from && b === to;
  });
  const label = active ? L(active.en, active.bn) : from || to ? `${from ?? '…'} → ${to ?? '…'}` : L('All time', 'সব সময়');
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((x) => !x)} className={cn('chip !h-10 font-medium', (from || to) && 'chip-on')} aria-expanded={open}>
        <CalendarDays className="h-4 w-4" /> {label} <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-[300px] animate-scale-in rounded-2xl border border-line bg-surface p-3 shadow-2xl sm:left-0 sm:right-auto">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" onClick={() => (onChange(...p.range()), setOpen(false))} className={cn('rounded-xl px-3 py-2 text-left text-sm transition hover:bg-sand', active?.id === p.id && 'bg-espresso text-cream hover:bg-espresso')}>{L(p.en, p.bn)}</button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <label className="text-xs text-mocha">{L('From', 'থেকে')}<input type="date" value={f} max={t || undefined} onChange={(e) => setF(e.target.value)} className="field mt-1 !px-2 !py-2 text-sm" /></label>
            <label className="text-xs text-mocha">{L('To', 'পর্যন্ত')}<input type="date" value={t} min={f || undefined} onChange={(e) => setT(e.target.value)} className="field mt-1 !px-2 !py-2 text-sm" /></label>
          </div>
          <div className="mt-3 flex justify-between gap-2">
            <button type="button" onClick={() => (onChange('', ''), setOpen(false))} className="btn-link text-xs">{L('Clear', 'মুছুন')}</button>
            <button type="button" onClick={() => (onChange(f, t), setOpen(false))} className="btn-primary !min-h-9 !px-4 text-xs">{L('Apply', 'প্রয়োগ')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}

/* ───────────── excel ───────────── */
export function ExportButton({ path, label }: { path: string; label?: string }) {
  const L = useL();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFile(path);
          toast.success(L('Excel downloaded', 'এক্সেল ডাউনলোড হয়েছে'));
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="btn-ghost !min-h-10 !px-4 text-sm"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-success" />} {label ?? L('Export Excel', 'এক্সেল এক্সপোর্ট')}
    </button>
  );
}

export function UploadButton({ accept, label, onFile }: { accept: string; label: string; onFile: (f: File) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={ref} type="file" accept={accept} hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        setBusy(true);
        try { await onFile(f); } finally { setBusy(false); }
      }} />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-ghost !min-h-10 !px-4 text-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {label}
      </button>
    </>
  );
}
export { Download };

/* ───────────── table ───────────── */
export type Col<T> = { key: string; head: React.ReactNode; cell: (r: T) => React.ReactNode; className?: string; sort?: string; hideSm?: boolean };

export function DataTable<T>({ rows, cols, loading, rowKey, onRow, selectable, selected, onSelect, sort, onSort, empty }: {
  rows: T[] | undefined; cols: Col<T>[]; loading?: boolean; rowKey: (r: T) => string; onRow?: (r: T) => void;
  selectable?: boolean; selected?: string[]; onSelect?: (ids: string[]) => void; sort?: string; onSort?: (s: string) => void; empty?: string;
}) {
  const L = useL();
  const ids = rows?.map(rowKey) ?? [];
  const all = ids.length > 0 && ids.every((i) => selected?.includes(i));
  const [sk, sd] = (sort ?? '').split(':');
  return (
    <>
    {/* mobile: cards (first column = title, rest as label/value rows) */}
    <ul className={cn('space-y-2 transition-opacity md:hidden', loading && rows && 'opacity-60')}>
      {!rows ? Array.from({ length: 5 }, (_, i) => <li key={i}><Sk className="h-28 !rounded-2xl" /></li>) : rows.length === 0 ? (
        <li className="card px-4 py-12 text-center text-sm text-mocha"><Inbox className="mx-auto mb-2 h-7 w-7 opacity-50" />{empty ?? L('Nothing matches these filters', 'এই ফিল্টারে কিছু নেই')}</li>
      ) : rows.map((r, i) => {
        const id = rowKey(r);
        const on = selected?.includes(id);
        const [first, ...rest] = cols;
        return (
          <li key={id} onClick={onRow ? () => onRow(r) : undefined} className={cn('card p-4 active:scale-[.99] transition', onRow && 'cursor-pointer', on && 'ring-2 ring-gold')} style={{ animation: `rise .4s var(--ease-silk) ${Math.min(i, 10) * 30}ms both` }}>
            <div className="flex items-start gap-3">
              {selectable && <input type="checkbox" aria-label={`Select ${id}`} checked={!!on} onClick={(e) => e.stopPropagation()} onChange={() => onSelect?.(on ? selected!.filter((x) => x !== id) : [...(selected ?? []), id])} className="mt-1 h-4 w-4 accent-[var(--color-espresso)]" />}
              <div className="min-w-0 flex-1">{first.cell(r)}</div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {rest.map((c) => (
                <div key={c.key} className="min-w-0"><dt className="text-[10.5px] uppercase tracking-wider text-mocha">{c.head}</dt><dd className="mt-0.5 min-w-0">{c.cell(r)}</dd></div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
    <div className={cn('card hidden overflow-hidden transition-opacity md:block', loading && rows && 'opacity-60')}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 z-10 bg-sand/80 text-left text-xs uppercase tracking-wider text-mocha backdrop-blur">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Select all" checked={all} onChange={() => onSelect?.(all ? [] : ids)} className="h-4 w-4 accent-[var(--color-espresso)]" />
                </th>
              )}
              {cols.map((c) => (
                <th key={c.key} className={cn('whitespace-nowrap px-4 py-3 font-semibold', c.hideSm && 'hidden md:table-cell', c.className)}>
                  {c.sort && onSort ? (
                    <button type="button" onClick={() => onSort(`${c.sort}:${sk === c.sort && sd === 'desc' ? 'asc' : 'desc'}`)} className="inline-flex items-center gap-1 hover:text-espresso">
                      {c.head}{sk === c.sort && (sd === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                    </button>
                  ) : c.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!rows ? (
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-t border-line">
                  {selectable && <td className="px-4 py-3"><Sk className="h-4 w-4" /></td>}
                  {cols.map((c) => <td key={c.key} className={cn('px-4 py-3.5', c.hideSm && 'hidden md:table-cell')}><Sk className="h-4 w-full max-w-[140px]" /></td>)}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length + (selectable ? 1 : 0)} className="px-4 py-16 text-center text-mocha"><Inbox className="mx-auto mb-2 h-8 w-8 opacity-50" />{empty ?? L('Nothing matches these filters', 'এই ফিল্টারে কিছু নেই')}</td></tr>
            ) : (
              rows.map((r, i) => {
                const id = rowKey(r);
                const on = selected?.includes(id);
                return (
                  <tr key={id} onClick={onRow ? () => onRow(r) : undefined} className={cn('border-t border-line transition-colors', onRow && 'cursor-pointer hover:bg-blush', on && 'bg-gold/10')} style={{ animation: `fade .35s ease ${Math.min(i, 12) * 25}ms both` }}>
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={`Select ${id}`} checked={!!on} onChange={() => onSelect?.(on ? selected!.filter((x) => x !== id) : [...(selected ?? []), id])} className="h-4 w-4 accent-[var(--color-espresso)]" />
                      </td>
                    )}
                    {cols.map((c) => <td key={c.key} className={cn('px-4 py-3', c.hideSm && 'hidden md:table-cell', c.className)}>{c.cell(r)}</td>)}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

/** Page numbers to show: 1 … 4 5 6 … 12 (first, last, and the neighbours of the current page). */
export const pageList = (page: number, pages: number) => {
  const keep = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  const out: (number | '…')[] = [];
  keep.forEach((p, i) => {
    if (i && p - keep[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
};

export function Pager({ page, pages, total, onPage, size = PAGE_SIZE }: { page: number; pages: number; total: number; onPage: (p: number) => void; size?: number }) {
  const { lang } = useT();
  const L = useL();
  const go = (p: number) => {
    onPage(p);
    document.querySelector('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const from = total ? (page - 1) * size + 1 : 0;
  const to = Math.min(total, page * size);
  if (pages <= 1) return <p className="mt-3 text-xs text-mocha">{num(total, lang)} {L('records', 'টি রেকর্ড')}</p>;
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm" aria-label={L('Pagination', 'পৃষ্ঠা')}>
      <p className="text-xs text-mocha">{num(from, lang)}–{num(to, lang)} / {num(total, lang)} {L('records', 'টি রেকর্ড')}</p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => go(page - 1)} className="chip !h-9 !px-2.5 disabled:opacity-40" aria-label={L('Previous', 'আগের')}><ChevronLeft className="h-4 w-4" /></button>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? <span key={`e${i}`} className="px-1 text-mocha">…</span> : (
            <button key={p} onClick={() => p !== page && go(p)} aria-current={p === page ? 'page' : undefined} className={cn('chip !h-9 min-w-9 justify-center !px-2.5 tabular-nums', p === page && 'chip-on')}>{num(p, lang)}</button>
          ),
        )}
        <button disabled={page >= pages} onClick={() => go(page + 1)} className="chip !h-9 !px-2.5 disabled:opacity-40" aria-label={L('Next', 'পরের')}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </nav>
  );
}

/* ───────────── form helpers ───────────── */
export function F({ label, children, hint, className }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mocha">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line px-4 py-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-gold', checked ? 'bg-espresso' : 'bg-line')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow transition-all duration-300 ease-[var(--ease-out-back)]', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </label>
  );
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: React.ReactNode }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="scrollbar-none mb-5 flex gap-1 overflow-x-auto rounded-full bg-sand p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn('min-h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-all duration-300', value === t.id ? 'bg-surface text-espresso shadow' : 'text-mocha hover:text-espresso')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function ErrorBox({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center p-10 text-center">
      <p className="font-semibold text-danger">{msg}</p>
      {onRetry && <button onClick={onRetry} className="btn-ghost mt-4">Retry</button>}
    </div>
  );
}

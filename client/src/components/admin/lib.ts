'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n/client';
import { apiFetch, ApiError } from '@/lib/client-api';
import { useStaffAuth } from '@/store/auth';

/** Inline bilingual label: L('Orders', 'অর্ডার'). Keeps admin copy next to its usage. */
export function useL() {
  const { lang } = useT();
  return useCallback((en: string, bn: string) => (lang === 'bn' ? bn : en), [lang]);
}

/** Permissions of the signed-in staff member (from /admin/me) — only used to hide UI; the API enforces every one. */
export function useCan() {
  const perms = useStaffAuth((s) => s.staff?.permissions);
  return useCallback((p: string) => perms === 'all' || (!!perms && perms.includes(p)), [perms]);
}

/** GET an admin endpoint; refetches when the path changes. Keeps previous data while reloading (no flash). */
export function useAdmin<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    // "ignore" flag (React docs pattern): a stale response is simply dropped.
    // No AbortController → no AbortError rejections when the user navigates away mid-request.
    let ignore = false;
    setLoading(true);
    apiFetch<T>(path, { admin: true })
      .then((d) => {
        if (ignore) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!ignore) setError(e instanceof ApiError ? e : new ApiError(0, String(e)));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [path, tick]);
  const reload = useCallback(() => setTick((x) => x + 1), []);
  return { data, error, loading, reload, setData };
}

/** Filters live in the URL (shareable, back-button friendly, survive refresh). */
export function useUrlState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(() => Object.fromEntries(sp.entries()) as Record<string, string>, [sp]);
  const set = useCallback(
    (patch: Record<string, string | undefined | null>, resetPage = true) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) (v == null || v === '' ? next.delete(k) : next.set(k, v));
      if (resetPage && !('page' in patch)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [sp, router, pathname],
  );
  const qs = useCallback((extra: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== '') q.set(k, String(v));
    return q.toString();
  }, [sp]);
  return { state, set, qs };
}

/** Debounce a value (search boxes). */
export function useDebounced<T>(v: T, ms = 350) {
  const [d, setD] = useState(v);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

/** Date helpers (local, YYYY-MM-DD) */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
export const PRESETS: { id: string; en: string; bn: string; range: () => [string, string] }[] = [
  { id: 'today', en: 'Today', bn: 'আজ', range: () => [daysAgo(0), daysAgo(0)] },
  { id: 'yesterday', en: 'Yesterday', bn: 'গতকাল', range: () => [daysAgo(1), daysAgo(1)] },
  { id: '7d', en: '7 days', bn: '৭ দিন', range: () => [daysAgo(6), daysAgo(0)] },
  { id: '30d', en: '30 days', bn: '৩০ দিন', range: () => [daysAgo(29), daysAgo(0)] },
  { id: '90d', en: '90 days', bn: '৯০ দিন', range: () => [daysAgo(89), daysAgo(0)] },
  {
    id: 'month', en: 'This month', bn: 'এই মাস',
    range: () => {
      const d = new Date();
      return [ymd(new Date(d.getFullYear(), d.getMonth(), 1)), daysAgo(0)];
    },
  },
  {
    id: 'lastmonth', en: 'Last month', bn: 'গত মাস',
    range: () => {
      const d = new Date();
      return [ymd(new Date(d.getFullYear(), d.getMonth() - 1, 1)), ymd(new Date(d.getFullYear(), d.getMonth(), 0))];
    },
  },
  { id: 'year', en: 'This year', bn: 'এই বছর', range: () => [`${new Date().getFullYear()}-01-01`, daysAgo(0)] },
];

/** Every list in the admin shows 15 rows per page. */
export const PAGE_SIZE = 15;

/**
 * Paginates a list that the API returns in full (staff, coupons, categories…) on the client, 15 per page.
 * Jumps back to page 1 when the list itself changes length (filtering, deleting).
 */
export function useClientPage<T>(rows: T[] | null | undefined, size = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = rows?.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => setPage(1), [total]);
  const current = Math.min(page, pages);
  return {
    rows: rows ? rows.slice((current - 1) * size, current * size) : undefined,
    pager: { page: current, pages, total, onPage: setPage, size },
  };
}

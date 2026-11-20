'use client';
import { BROWSER_API } from './config';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

type Opts = { method?: string; body?: unknown; headers?: Record<string, string>; admin?: boolean; signal?: AbortSignal };

/** Sends an expired admin session to the staff sign-in page (once), keeping where the user was. */
const toStaffLogin = () => {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin/login')) return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/admin/login?next=${next}`);
};

/**
 * Browser-side API client. Auth is the httpOnly session cookie (Passport.js on the server) —
 * nothing secret is ever stored in JS or sent as a custom header.
 */
export async function apiFetch<T>(path: string, opts: Opts = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: Record<string, string> = { ...(opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}), ...opts.headers };
  const res = await fetch(`${BROWSER_API}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
    signal: opts.signal,
  });
  let json: { success: boolean; data?: T; error?: { message: string; details?: unknown } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  if (res.status === 401 && opts.admin) toStaffLogin();
  if (!res.ok || !json?.success) throw new ApiError(res.status, json?.error?.message ?? 'Something went wrong. Please try again.', json?.error?.details);
  return json.data as T;
}

/** Downloads a file (Excel/JSON) from an admin endpoint, preserving the server's filename. */
export async function downloadFile(path: string) {
  const res = await fetch(`${BROWSER_API}${path}`, { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 401) toStaffLogin();
    let msg = 'Download failed';
    try {
      msg = (await res.json()).error.message;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? 'ruposhi-export.xlsx';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

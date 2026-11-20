import { NextResponse, type NextRequest } from 'next/server';
import { API_URL } from './lib/config';

// server-only secret shared with the API (never NEXT_PUBLIC_): proves the visitor-IP header below really came from us
const PROXY_SECRET = process.env.PROXY_SECRET ?? '';

/**
 * Browser → /api/v1/* → Express API. Same as the rewrite in next.config.ts, plus the visitor's real IP:
 * on Vercel the API otherwise only ever sees Vercel's own address, so rate limits would lump every shopper together.
 */
function toApi(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.delete('x-rp-proxy');
  headers.delete('x-rp-client-ip');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (PROXY_SECRET && ip) {
    headers.set('x-rp-proxy', PROXY_SECRET);
    headers.set('x-rp-client-ip', ip);
  }
  return NextResponse.rewrite(new URL(`${API_URL}${pathname.slice('/api/v1'.length)}${search}`), { request: { headers } });
}

/**
 * Next.js 16 proxy (formerly middleware): a fast, optimistic gate.
 * It only checks that a session cookie EXISTS — the API verifies the signature, expiry,
 * revocation and role on every request, so a fake cookie gets nowhere.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api/v1/')) return toApi(request);
  const back = encodeURIComponent(pathname + search);

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !request.cookies.has('rp_staff'))
    return NextResponse.redirect(new URL(`/admin/login?next=${back}`, request.url));

  if (pathname.startsWith('/account') && !request.cookies.has('rp_session'))
    return NextResponse.redirect(new URL(`/login?next=${back}`, request.url));

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/account/:path*', '/api/v1/:path*'] };

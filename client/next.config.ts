import type { NextConfig } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
const isDev = process.env.NODE_ENV !== 'production';
// only force HTTPS when the site is actually served over HTTPS (so `npm run preview` on http://localhost works)
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');

/** Strict security headers incl. a Content-Security-Policy tuned for Next.js + Meta Pixel + GA4. */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://connect.facebook.net https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.pexels.com https://res.cloudinary.com https://www.facebook.com https://www.google-analytics.com https://i.ytimg.com",
  "font-src 'self'",
  `connect-src 'self' https://api.cloudinary.com https://www.facebook.com https://connect.facebook.net https://www.google-analytics.com https://region1.google-analytics.com`,
  'frame-src https://www.youtube-nocookie.com',
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  isHttps ? 'upgrade-insecure-requests' : '',
].filter(Boolean).join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1600],
    imageSizes: [64, 96, 128, 200, 256, 320],
    qualities: [60, 70, 75, 85],
    minimumCacheTTL: 2678400,
  },
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
  // Same-origin API: the browser talks to /api/v1/*, Next proxies to the Express server (cookies stay first-party).
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API.replace(/\/$/, '')}/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...(!isHttps ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
        ],
      },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;

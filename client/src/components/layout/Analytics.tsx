'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { captureSource, track } from '@/lib/track';

/**
 * Loads Meta Pixel / GA4 only when IDs are configured, AFTER the page is interactive
 * (strategy="lazyOnload") so they never hurt Lighthouse. Scroll reveals are pure CSS (scroll-driven animations) — no JS, no hydration risk.
 */
export function Analytics({ pixelId, ga4Id }: { pixelId?: string; ga4Id?: string }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    captureSource();
    document.documentElement.classList.add('js');
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
    }
    if (!pathname.startsWith('/admin')) track('page_view');
  }, [pathname]);

  return (
    <>
      {pixelId && /^\d+$/.test(pixelId) && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');`}
        </Script>
      )}
      {ga4Id && /^G-[A-Z0-9]+$/.test(ga4Id) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}');`}</Script>
        </>
      )}
    </>
  );
}

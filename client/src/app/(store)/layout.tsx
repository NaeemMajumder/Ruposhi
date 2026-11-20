import { LangProvider } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { api } from '@/lib/api';
import { tr } from '@/lib/format';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNav } from '@/components/layout/MobileNav';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { Suspense } from 'react';
import { NavProgress } from '@/components/layout/NavProgress';
import { Analytics } from '@/components/layout/Analytics';
import { Toaster } from '@/components/ui/Toast';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { PageFade } from '@/components/layout/PageFade';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { lang, dict } = await getI18n();
  const [home, settings, categories] = await Promise.all([api.home(), api.settings(), api.categories()]);
  const announcements = home?.announcements ?? [];
  const cats = categories ?? [];
  const pixel = settings?.tracking.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const ga4 = settings?.tracking.ga4Id || process.env.NEXT_PUBLIC_GA4_ID;

  return (
    <LangProvider lang={lang}>
      <a href="#main" className="sr-only z-[100] rounded-full bg-espresso px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {announcements.length > 0 && (
        <div className="overflow-hidden bg-night text-ivory" role="region" aria-label="Announcements">
          <div className="flex w-max animate-marquee gap-12 py-2 text-[12px] tracking-wide motion-reduce:animate-none">
            {[...announcements, ...announcements].map((a, i) => (
              <span key={i} className="flex items-center gap-12 whitespace-nowrap" aria-hidden={i >= announcements.length}>
                {tr(a, lang)}
                <span className="text-gold" aria-hidden="true">✦</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <Suspense><NavProgress /></Suspense>
      <Header categories={cats} />
      <main id="main" className="min-h-[60vh]"><PageFade>{children}</PageFade></main>
      <Footer settings={settings} categories={cats} />
      <MobileNav />
      <CartDrawer />
      <Toaster />
      {settings?.store.whatsapp && <WhatsAppButton number={settings.store.whatsapp} label={dict.nav.contact} />}
      <Analytics pixelId={pixel} ga4Id={ga4} />
    </LangProvider>
  );
}

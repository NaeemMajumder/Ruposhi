import type { Metadata, Viewport } from 'next';
import { fontVars } from '@/fonts';
import { getLang } from '@/i18n/server';
import { getTheme } from '@/theme/server';
import { BRAND, SITE_URL } from '@/lib/config';
import { JsonLd } from '@/components/seo/JsonLd';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `Ruposhi — ${BRAND.tagline[lang]} | Premium Ethnic Wear Bangladesh`, template: '%s | Ruposhi' },
    description: BRAND.description[lang],
    applicationName: 'Ruposhi',
    keywords: ['saree', 'jamdani', 'banarasi', 'panjabi', 'salwar kameez', 'kurti', 'ethnic wear Bangladesh', 'শাড়ি', 'পাঞ্জাবি', 'online shopping Bangladesh'],
    openGraph: {
      type: 'website',
      siteName: 'Ruposhi',
      locale: lang === 'bn' ? 'bn_BD' : 'en_US',
      url: SITE_URL,
      title: `Ruposhi — ${BRAND.tagline[lang]}`,
      description: BRAND.description[lang],
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    formatDetection: { telephone: false },
    icons: { icon: '/icon.svg', apple: '/icon.svg' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF9F5' },
    { media: '(prefers-color-scheme: dark)', color: '#15100C' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html lang={lang} className={`${fontVars}${theme === 'system' ? '' : ` ${theme}`}`} suppressHydrationWarning data-scroll-behavior="smooth">
      {/* browser extensions (Grammarly etc.) inject attributes into <body>; don't treat that as a mismatch */}
      <body suppressHydrationWarning>
        <JsonLd
          data={[
            {
              '@context': 'https://schema.org',
              '@type': 'ClothingStore',
              name: 'Ruposhi',
              alternateName: 'রূপসী',
              url: SITE_URL,
              logo: `${SITE_URL}/icon.svg`,
              description: BRAND.description.en,
              address: { '@type': 'PostalAddress', addressLocality: 'Dhaka', addressCountry: 'BD' },
              currenciesAccepted: 'BDT',
              paymentAccepted: 'Cash, bKash, Nagad, Credit Card',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Ruposhi',
              url: SITE_URL,
              potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
            },
          ]}
        />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { ShopView, type SP } from '@/components/shop/ShopView';
import { PageHeader } from '@/components/shop/PageHeader';

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { t } = await getI18n();
  const sp = await searchParams;
  const filtered = Object.keys(sp).some((k) => k !== 'page');
  return {
    title: t('shop.title'),
    description: 'Shop sarees, panjabis, salwar kameez and kurtis — Banarasi, Jamdani, Katan and more. Cash on delivery across Bangladesh.',
    alternates: { canonical: '/shop' },
    // filtered/sorted permutations are noindex to avoid duplicate content; canonical stays /shop
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { t, lang } = await getI18n();
  return (
    <ShopView
      sp={sp}
      base="/shop"
      header={<PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('shop.title') }]} eyebrow={lang === 'bn' ? 'রূপসী কালেকশন' : 'The Ruposhi collection'} title={t('shop.title')} sub={lang === 'bn' ? 'শাড়ি, পাঞ্জাবি, সালোয়ার কামিজ আর কুর্তি — প্রতিটি আসল আলোয় ধারণ করা।' : 'Sarees, panjabis, salwar kameez and kurtis — every piece filmed in real light.'} />}
    />
  );
}

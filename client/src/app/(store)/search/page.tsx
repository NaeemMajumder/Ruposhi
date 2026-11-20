import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { ShopView, type SP } from '@/components/shop/ShopView';
import { PageHeader } from '@/components/shop/PageHeader';
import { SearchBox } from '@/components/shop/SearchBox';

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 80) ?? '';
  return (
    <ShopView
      sp={sp}
      base="/search"
      header={
        <>
          <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('nav.search') }]} title={q ? t('shop.searchFor', { q }) : t('nav.search')} />
          <SearchBox initial={q} />
        </>
      }
    />
  );
}

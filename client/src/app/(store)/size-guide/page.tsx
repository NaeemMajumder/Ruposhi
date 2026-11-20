import type { Metadata } from 'next';
import { getI18n } from '@/i18n/server';
import { PageHeader } from '@/components/shop/PageHeader';
import { SizeTables } from '@/components/product/SizeGuide';

export const metadata: Metadata = { title: 'Size guide', description: 'Panjabi, salwar kameez, kurti and saree measurements.', alternates: { canonical: '/size-guide' } };

export default async function SizeGuidePage() {
  const { t } = await getI18n();
  return (
    <div className="container-x max-w-3xl pb-20">
      <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('footer.sizeGuide') }]} title={t('footer.sizeGuide')} />
      <SizeTables />
    </div>
  );
}

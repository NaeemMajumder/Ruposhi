import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { getI18n } from '@/i18n/server';
import { PageHeader } from '@/components/shop/PageHeader';
import { TrackForm } from '@/components/order/TrackForm';

export const metadata: Metadata = { title: 'Track your order', description: 'Track your Ruposhi order with your order number and phone.', alternates: { canonical: '/track' } };

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ orderNo?: string }> }) {
  const [{ t }, sp, settings] = await Promise.all([getI18n(), searchParams, api.settings()]);
  return (
    <div className="container-x max-w-3xl pb-20">
      <PageHeader crumbs={[{ name: t('nav.home'), href: '/' }, { name: t('track.title') }]} title={t('track.title')} sub={t('track.sub')} />
      <TrackForm initialOrderNo={sp.orderNo?.slice(0, 30)} settings={settings} />
    </div>
  );
}

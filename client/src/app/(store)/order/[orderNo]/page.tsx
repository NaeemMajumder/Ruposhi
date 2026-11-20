import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { OrderSuccess } from '@/components/order/OrderSuccess';

export const metadata: Metadata = { title: 'Order placed', robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ orderNo: string }>; searchParams: Promise<{ payment?: string }> }) {
  const [{ orderNo }, sp, settings] = await Promise.all([params, searchParams, api.settings()]);
  return <OrderSuccess orderNo={decodeURIComponent(orderNo).slice(0, 30)} settings={settings} payment={sp.payment} />;
}

import type { Metadata } from 'next';
import { DemoGateway } from '@/components/order/DemoGateway';

export const metadata: Metadata = { title: 'Payment', robots: { index: false, follow: false } };

export default async function DemoPaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <DemoGateway gateway={sp.gateway ?? ''} orderNo={sp.order ?? ''} amount={Number(sp.amount ?? 0)} token={sp.token ?? ''} />;
}

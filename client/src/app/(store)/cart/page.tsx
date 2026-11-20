import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { api } from '@/lib/api';

export const metadata: Metadata = { title: 'Your bag', robots: { index: false, follow: true } };

export default async function CartPage() {
  const [settings, list] = await Promise.all([api.settings(), api.products('featured=true&limit=4&sort=popular')]);
  return <div className="min-h-[1200px]"><CartView giftWrapFee={settings?.delivery.giftWrapFee ?? 150} suggestions={list?.items ?? []} /></div>;
}

import { Suspense } from 'react';
import { Coupons } from '@/components/admin/pages/Coupons';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Coupons' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Coupons /></Suspense>;
}

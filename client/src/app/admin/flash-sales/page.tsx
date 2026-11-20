import { Suspense } from 'react';
import { FlashSales } from '@/components/admin/pages/FlashSales';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Flash sales' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><FlashSales /></Suspense>;
}

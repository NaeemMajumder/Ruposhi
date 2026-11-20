import { Suspense } from 'react';
import { Inventory } from '@/components/admin/pages/Inventory';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Inventory' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Inventory /></Suspense>;
}

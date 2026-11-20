import { Suspense } from 'react';
import { Products } from '@/components/admin/pages/Products';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Products' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Products /></Suspense>;
}

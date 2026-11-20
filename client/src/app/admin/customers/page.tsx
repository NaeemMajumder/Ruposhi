import { Suspense } from 'react';
import { Customers } from '@/components/admin/pages/Customers';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Customers' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Customers /></Suspense>;
}

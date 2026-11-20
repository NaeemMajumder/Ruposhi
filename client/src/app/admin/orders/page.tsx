import { Suspense } from 'react';
import { Orders } from '@/components/admin/pages/Orders';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Orders' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Orders /></Suspense>;
}

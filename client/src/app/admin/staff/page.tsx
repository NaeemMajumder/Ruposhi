import { Suspense } from 'react';
import { Staff } from '@/components/admin/pages/Staff';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Staff' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Staff /></Suspense>;
}

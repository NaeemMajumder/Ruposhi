import { Suspense } from 'react';
import { Reports } from '@/components/admin/pages/Reports';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Reports' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Reports /></Suspense>;
}

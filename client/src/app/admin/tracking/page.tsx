import { Suspense } from 'react';
import { Tracking } from '@/components/admin/pages/Tracking';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Tracking' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Tracking /></Suspense>;
}

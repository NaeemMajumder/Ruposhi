import { Suspense } from 'react';
import { Backup } from '@/components/admin/pages/Backup';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Backup' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Backup /></Suspense>;
}

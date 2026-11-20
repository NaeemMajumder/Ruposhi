import { Suspense } from 'react';
import { Marketing } from '@/components/admin/pages/Marketing';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Marketing' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Marketing /></Suspense>;
}

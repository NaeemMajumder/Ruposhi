import { Suspense } from 'react';
import { Reviews } from '@/components/admin/pages/Reviews';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Reviews' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Reviews /></Suspense>;
}

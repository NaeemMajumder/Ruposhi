import { Suspense } from 'react';
import { Categories } from '@/components/admin/pages/Categories';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Categories' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Categories /></Suspense>;
}

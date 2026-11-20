import { Suspense } from 'react';
import { Content } from '@/components/admin/pages/Content';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Homepage content' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Content /></Suspense>;
}

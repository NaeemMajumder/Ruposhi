import { Suspense } from 'react';
import { Audit } from '@/components/admin/pages/Audit';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Audit log' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><Audit /></Suspense>;
}

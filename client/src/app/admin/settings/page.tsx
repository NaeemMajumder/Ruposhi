import { Suspense } from 'react';
import { SettingsPage } from '@/components/admin/pages/SettingsPage';
import { TableSk } from '@/components/ui/Skeletons';
export const metadata = { title: 'Settings' };
export default function Page() {
  return <Suspense fallback={<TableSk />}><SettingsPage /></Suspense>;
}

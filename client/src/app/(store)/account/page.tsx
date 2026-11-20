import type { Metadata } from 'next';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { AccountView } from '@/components/account/AccountView';
import { TableSk } from '@/components/ui/Skeletons';

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const locations = await api.locations();
  return (
    <Suspense fallback={<div className="container-x py-10"><TableSk /></div>}>
      <AccountView locations={locations ?? []} />
    </Suspense>
  );
}

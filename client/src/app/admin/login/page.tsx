import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StaffLogin } from '@/components/admin/StaffLogin';

export const metadata: Metadata = { title: 'Staff sign in' };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <StaffLogin />
    </Suspense>
  );
}

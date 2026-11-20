import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterView } from '@/components/account/RegisterView';
import { FormSk } from '@/components/ui/Skeletons';

export const metadata: Metadata = { title: 'Create account', robots: { index: false, follow: true } };

export default function RegisterPage() {
  return (
    <Suspense fallback={<FormSk />}>
      <RegisterView />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginView } from '@/components/account/LoginView';
import { FormSk } from '@/components/ui/Skeletons';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <Suspense fallback={<FormSk />}>
      <LoginView />
    </Suspense>
  );
}

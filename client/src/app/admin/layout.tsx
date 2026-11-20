import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LangProvider } from '@/i18n/client';
import { getI18n } from '@/i18n/server';
import { AdminShell } from '@/components/admin/Shell';
import { NavProgress } from '@/components/layout/NavProgress';
import { Toaster } from '@/components/ui/Toast';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Ruposhi Admin' }, robots: { index: false, follow: false, nocache: true } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getI18n();
  return (
    <LangProvider lang={lang}>
      <Suspense><NavProgress /></Suspense>
      <AdminShell>{children}</AdminShell>
      <Toaster />
    </LangProvider>
  );
}

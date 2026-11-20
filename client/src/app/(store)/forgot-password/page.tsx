import type { Metadata } from 'next';
import { ForgotView } from '@/components/account/ForgotView';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false, follow: true } };

export default function ForgotPasswordPage() {
  return <ForgotView />;
}

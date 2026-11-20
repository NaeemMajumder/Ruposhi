import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { Lock } from 'lucide-react';
import { CheckoutView } from '@/components/checkout/CheckoutView';
import { getI18n } from '@/i18n/server';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const [settings, locations, { t, lang }] = await Promise.all([api.settings(), api.locations(), getI18n()]);
  // reserve height so the client-only form doesn't shift the footer (CLS)
  return (
    <div className="min-h-[1500px] lg:min-h-[1100px]">
      <div className="container-x pt-5 sm:pt-8">
        <div className="flex items-center justify-between">
          <h1 className="h-display animate-lift text-[40px] sm:text-[56px]">{t('checkout.title')}</h1>
          <span className="hidden items-center gap-1.5 text-xs text-mocha sm:flex"><Lock className="h-3.5 w-3.5" /> SSL · {lang === 'bn' ? 'নিরাপদ' : 'Secure'}</span>
        </div>
        <p className="mt-1 text-sm text-mocha">{t('checkout.guestNote')}</p>
      </div>
      <CheckoutView settings={settings} locations={locations ?? []} />
    </div>
  );
}

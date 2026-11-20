import Link from 'next/link';
import { getI18n } from '@/i18n/server';
import { LotusMark } from '@/components/ui/Logo';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="relative">
        <LotusMark className="h-28 w-28 animate-spin-slow text-gold/50" strokeWidth={1} />
        <p className="absolute inset-0 grid place-items-center font-display text-4xl">404</p>
      </div>
      <h1 className="h-display mt-8 animate-rise text-5xl sm:text-6xl">{t('errors.notFound')}</h1>
      <p className="mt-3 max-w-md animate-rise text-mocha [animation-delay:.1s]">{t('errors.notFoundSub')}</p>
      <div className="mt-8 flex animate-rise gap-3 [animation-delay:.2s]">
        <Link href="/" className="btn-primary">{t('errors.goHome')}</Link>
        <Link href="/shop" className="btn-ghost">{t('nav.allProducts')}</Link>
      </div>
    </div>
  );
}

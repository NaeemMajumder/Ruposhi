'use client';
import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { LotusMark } from '@/components/ui/Logo';
import { useT } from '@/i18n/client';

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <LotusMark className="h-16 w-16 animate-pulse text-gold" />
      <h1 className="h-display mt-6 text-5xl">{t('errors.generic')}</h1>
      {error.digest && <p className="mt-2 font-mono text-xs text-mocha">ref: {error.digest}</p>}
      <button onClick={reset} className="btn-primary mt-8"><RotateCcw className="h-4 w-4" /> {t('common.retry')}</button>
    </div>
  );
}

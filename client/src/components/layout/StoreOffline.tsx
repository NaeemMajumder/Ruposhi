import { getI18n } from '@/i18n/server';
import { LotusMark } from '../ui/Logo';

/** Shown when the API is unreachable (e.g. the server folder isn't running). */
export async function StoreOffline() {
  const { t } = await getI18n();
  return (
    <div className="container-x flex flex-col items-center py-28 text-center">
      <LotusMark className="h-16 w-16 text-gold" />
      <h1 className="h-display mt-6 text-5xl">{t('errors.generic')}</h1>
      <p className="mt-3 max-w-md text-mocha">{t('errors.offline')}</p>
      <p className="mt-6 rounded-xl bg-sand px-4 py-3 font-mono text-xs text-mocha">Dev tip: start the API → cd server &amp;&amp; npm run dev</p>
    </div>
  );
}

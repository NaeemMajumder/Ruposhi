import 'server-only';
import { cookies } from 'next/headers';
import type { Lang } from '@/lib/types';
import { dictionaries } from './dictionaries';
import { makeT } from './t';

export const getLang = async (): Promise<Lang> => ((await cookies()).get('lang')?.value === 'bn' ? 'bn' : 'en');

export const getI18n = async () => {
  const lang = await getLang();
  return { lang, t: makeT(dictionaries[lang]), dict: dictionaries[lang] };
};

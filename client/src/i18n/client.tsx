'use client';
import { createContext, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Lang } from '@/lib/types';
import { dictionaries } from './dictionaries';
import { makeT, type TFn } from './t';

const Ctx = createContext<{ lang: Lang; t: TFn }>({ lang: 'en', t: makeT(dictionaries.en) });

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(dictionaries[lang]) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

/** Switches language via cookie and re-renders server components in the new language. */
export function useSetLang() {
  const router = useRouter();
  return (lang: Lang) => {
    document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
    router.refresh();
  };
}

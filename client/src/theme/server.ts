import { cookies } from 'next/headers';

export type ThemePref = 'light' | 'dark' | 'system';

/** Read the saved theme on the server so <html> gets the right class before first paint (no flash). */
export async function getTheme(): Promise<ThemePref> {
  const v = (await cookies()).get('theme')?.value;
  return v === 'light' || v === 'dark' ? v : 'system';
}

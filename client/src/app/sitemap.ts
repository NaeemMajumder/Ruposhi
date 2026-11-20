import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { JOURNAL, POLICIES } from '@/content/site';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, cats] = await Promise.all([api.slugs(), api.categories()]);
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'weekly', lastModified: Date = now) => ({ url: `${SITE_URL}${path}`, lastModified, changeFrequency, priority });
  return [
    page('/', 1, 'daily'),
    page('/shop', 0.9, 'daily'),
    ...(cats ?? []).map((c) => page(`/category/${c.slug}`, 0.85, 'daily')),
    ...(slugs ?? []).map((p) => page(`/product/${p.slug}`, 0.8, 'weekly', new Date(p.updatedAt))),
    page('/journal', 0.6),
    ...JOURNAL.map((a) => page(`/journal/${a.slug}`, 0.5, 'monthly', new Date(a.date))),
    ...['/about', '/contact', '/faq', '/size-guide', '/track'].map((p) => page(p, 0.4, 'monthly')),
    ...Object.keys(POLICIES).map((k) => page(`/policies/${k}`, 0.3, 'yearly')),
  ];
}

import { API_URL } from './config';
import type { Category, HomeData, LocationTree, Product, ProductList, PublicSettings, Review } from './types';

/**
 * Server-side data fetching (Server Components). Responses are cached by Next's data cache
 * and revalidated every `revalidate` seconds. Failures return `null` so a page never crashes
 * when the API is temporarily down — it renders an empty state instead.
 */
// lets the API tell these cached page fetches apart from visitors (they are never rate-limited); server-only
const internal: HeadersInit = process.env.PROXY_SECRET ? { 'x-rp-proxy': process.env.PROXY_SECRET } : {};

async function get<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: internal, next: { revalidate, tags: ['api'] }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data: T };
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export const api = {
  home: () => get<HomeData>('/home', 60),
  settings: () => get<PublicSettings>('/settings/public', 300),
  categories: () => get<(Category & { productCount: number })[]>('/categories', 300),
  category: (slug: string) => get<Category>(`/categories/${slug}`, 300),
  products: (qs: string) => get<ProductList>(`/products?${qs}`, 30),
  product: (slug: string) => get<Product>(`/products/${encodeURIComponent(slug)}`, 30),
  related: (slug: string) => get<{ related: Product[]; completeTheLook: Product[] }>(`/products/${encodeURIComponent(slug)}/related`, 120),
  reviews: (slug: string) => get<{ items: Review[]; total: number; average: number; count: number; breakdown: { star: number; count: number }[] }>(`/products/${encodeURIComponent(slug)}/reviews?limit=6`, 120),
  slugs: () => get<{ slug: string; updatedAt: string }[]>('/products/slugs', 600),
  locations: () => get<LocationTree[]>('/locations', 86400),
};

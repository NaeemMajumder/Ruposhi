import { repos } from '../repositories/index.js';
import { notFound } from '../lib/errors.js';
import type { FlashSale, Product } from '../types/domain.js';
import { expandQuery, scoreText } from '../utils/text.js';

export interface ProductQuery {
  q?: string;
  category?: string;
  gender?: string;
  fabric?: string;
  occasion?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  featured?: boolean;
  rating?: number;
  tag?: string;
  slugs?: string;
  ids?: string;
  sort?: 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

export const activeFlashSale = async (): Promise<FlashSale | null> => {
  const now = new Date().toISOString();
  return repos.flashSales.findOne({ isActive: true, startsAt: { $lte: now }, endsAt: { $gte: now } });
};

export const totalStock = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);

/** The price a customer pays right now (flash sale applied). */
export const effectivePrice = (p: Product, sale: FlashSale | null) =>
  sale && sale.productSlugs.includes(p.slug) ? Math.round((p.price * (100 - sale.discountPercent)) / 100) : p.price;

/** Public shape — strips cost price & internal fields, adds computed price/stock info. */
export const toPublic = (p: Product, sale: FlashSale | null) => {
  const { costPrice: _cost, viewCount: _v, ...rest } = p;
  const salePrice = effectivePrice(p, sale);
  const stock = totalStock(p);
  const inFlash = salePrice !== p.price;
  return {
    ...rest,
    price: salePrice,
    compareAtPrice: inFlash ? p.compareAtPrice ?? p.price : p.compareAtPrice,
    regularPrice: p.price,
    flashSale: inFlash && sale ? { endsAt: sale.endsAt, percent: sale.discountPercent, title: sale.title } : null,
    totalStock: stock,
    inStock: stock > 0 || p.preOrder,
    lowStock: stock > 0 && stock <= 5,
  };
};
export type PublicProduct = ReturnType<typeof toPublic>;

const matches = (p: Product, q: ProductQuery, priceOf: (p: Product) => number, skip: keyof ProductQuery | null = null) => {
  const cats = list(q.category);
  if (skip !== 'category' && cats.length && !cats.includes(p.category)) return false;
  if (q.gender && p.gender !== q.gender) return false;
  const fabrics = list(q.fabric);
  if (skip !== 'fabric' && fabrics.length && !fabrics.includes(p.fabric)) return false;
  const occ = list(q.occasion);
  if (skip !== 'occasion' && occ.length && !occ.some((o) => p.occasions.includes(o))) return false;
  const colors = list(q.color);
  if (skip !== 'color' && colors.length && !p.colors.some((c) => colors.includes(c.name.en))) return false;
  const sizes = list(q.size);
  if (skip !== 'size' && sizes.length && !p.variants.some((v) => sizes.includes(v.size) && (v.stock > 0 || p.preOrder))) return false;
  const price = priceOf(p);
  if (skip !== 'minPrice' && q.minPrice != null && price < q.minPrice) return false;
  if (skip !== 'minPrice' && q.maxPrice != null && price > q.maxPrice) return false;
  if (q.inStock && !(totalStock(p) > 0 || p.preOrder)) return false;
  if (q.onSale && !(p.compareAtPrice && p.compareAtPrice > p.price) && priceOf(p) === p.price) return false;
  if (q.isNew && !p.isNewArrival) return false;
  if (q.featured && !p.isFeatured) return false;
  if (q.rating && p.rating < q.rating) return false;
  if (q.tag && !p.tags.includes(q.tag)) return false;
  const slugs = list(q.slugs);
  if (slugs.length && !slugs.includes(p.slug)) return false;
  const ids = list(q.ids);
  if (ids.length && !ids.includes(p._id)) return false;
  return true;
};

const searchable = (p: Product) =>
  [p.name.en, p.name.bn, p.category, p.fabric, p.tags.join(' '), p.occasions.join(' '), p.colors.map((c) => `${c.name.en} ${c.name.bn}`).join(' '), p.shortDescription.en].join(' ');

/** Product listing with full filtering, sorting, paging and live facet counts. */
export const listProducts = async (q: ProductQuery) => {
  const [all, sale] = await Promise.all([repos.products.find({ status: 'active' }), activeFlashSale()]);
  const priceOf = (p: Product) => effectivePrice(p, sale);

  // text search (typo + Banglish tolerant) narrows the base set and provides a relevance score
  let base = all;
  const scores = new Map<string, number>();
  if (q.q && q.q.trim()) {
    const terms = expandQuery(q.q);
    base = all.filter((p) => {
      const s = scoreText(searchable(p), terms);
      if (s > 0) scores.set(p._id, s);
      return s > 0;
    });
  }

  const filtered = base.filter((p) => matches(p, q, priceOf));

  const sort = q.sort ?? (q.q ? undefined : 'featured');
  filtered.sort((a, b) => {
    switch (sort) {
      case 'newest': return b.createdAt.localeCompare(a.createdAt);
      case 'price_asc': return priceOf(a) - priceOf(b);
      case 'price_desc': return priceOf(b) - priceOf(a);
      case 'popular': return b.soldCount - a.soldCount;
      case 'rating': return b.rating - a.rating || b.reviewCount - a.reviewCount;
      case 'featured': return Number(b.isFeatured) - Number(a.isFeatured) || b.soldCount - a.soldCount;
      default: return (scores.get(b._id) ?? 0) - (scores.get(a._id) ?? 0) || b.soldCount - a.soldCount;
    }
  });

  const limit = Math.min(Math.max(q.limit ?? 12, 1), 48);
  const page = Math.max(q.page ?? 1, 1);
  const items = filtered.slice((page - 1) * limit, page * limit).map((p) => toPublic(p, sale));

  // facets: each facet counts against all OTHER active filters (standard e-commerce behaviour)
  const facetBase = (skip: keyof ProductQuery) => base.filter((p) => matches(p, q, priceOf, skip));
  const count = (arr: string[]) => Object.entries(arr.reduce<Record<string, number>>((m, k) => ((m[k] = (m[k] ?? 0) + 1), m), {})).map(([value, n]) => ({ value, count: n })).sort((a, b) => b.count - a.count);
  const colorMap = new Map<string, { value: string; hex: string; bn: string; count: number }>();
  for (const p of facetBase('color')) for (const c of p.colors) {
    const cur = colorMap.get(c.name.en) ?? { value: c.name.en, hex: c.hex, bn: c.name.bn, count: 0 };
    cur.count++;
    colorMap.set(c.name.en, cur);
  }
  const prices = all.map(priceOf);
  const sizeOrder = ['Free Size', 'S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44', '46'];

  return {
    items,
    total: filtered.length,
    page,
    limit,
    pages: Math.max(1, Math.ceil(filtered.length / limit)),
    facets: {
      categories: count(facetBase('category').map((p) => p.category)),
      fabrics: count(facetBase('fabric').map((p) => p.fabric)),
      occasions: count(facetBase('occasion').flatMap((p) => p.occasions)),
      colors: [...colorMap.values()].sort((a, b) => b.count - a.count),
      sizes: count(facetBase('size').flatMap((p) => [...new Set(p.variants.map((v) => v.size))])).sort((a, b) => sizeOrder.indexOf(a.value) - sizeOrder.indexOf(b.value)),
      price: { min: Math.min(...prices), max: Math.max(...prices) },
    },
  };
};

export const getProductBySlug = async (slug: string, countView = true) => {
  const p = await repos.products.findOne({ slug, status: 'active' });
  if (!p) throw notFound('Product');
  if (countView) void repos.products.update(p._id, { viewCount: p.viewCount + 1 });
  return toPublic(p, await activeFlashSale());
};

export const relatedProducts = async (slug: string, limit = 8) => {
  const [p, all, sale] = await Promise.all([repos.products.findOne({ slug }), repos.products.find({ status: 'active' }), activeFlashSale()]);
  if (!p) throw notFound('Product');
  const scored = all
    .filter((x) => x.slug !== slug)
    .map((x) => ({
      x,
      s: (x.category === p.category ? 3 : 0) + x.occasions.filter((o) => p.occasions.includes(o)).length + (x.fabric === p.fabric ? 1 : 0),
    }))
    .sort((a, b) => b.s - a.s || b.x.soldCount - a.x.soldCount)
    .slice(0, limit)
    .map(({ x }) => toPublic(x, sale));
  const look = (p.completeTheLook ?? []).map((s) => all.find((x) => x.slug === s)).filter(Boolean).map((x) => toPublic(x!, sale));
  return { related: scored, completeTheLook: look };
};

/** Autocomplete — returns products + matching categories, tolerant of typos and Banglish. */
export const suggest = async (q: string) => {
  const terms = expandQuery(q);
  const [all, sale, cats] = await Promise.all([repos.products.find({ status: 'active' }), activeFlashSale(), repos.categories.find({ isActive: true })]);
  const products = all
    .map((p) => ({ p, s: scoreText(searchable(p), terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .map(({ p }) => {
      const pub = toPublic(p, sale);
      return { slug: pub.slug, name: pub.name, image: pub.images[0]?.url, price: pub.price, category: pub.category };
    });
  const categories = cats.filter((c) => scoreText(`${c.name.en} ${c.name.bn} ${c.slug}`, terms) > 0).map((c) => ({ slug: c.slug, name: c.name }));
  return { products, categories, terms: terms.slice(0, 6) };
};

export const listCategories = async () => {
  const [cats, products] = await Promise.all([repos.categories.find({ isActive: true }, { sort: { sortOrder: 1 } }), repos.products.find({ status: 'active' })]);
  return cats.map((c) => ({ ...c, productCount: products.filter((p) => p.category === c.slug).length }));
};

export const getCategory = async (slug: string) => {
  const c = await repos.categories.findOne({ slug, isActive: true });
  if (!c) throw notFound('Category');
  return c;
};

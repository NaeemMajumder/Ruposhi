import type { Request, Response } from 'express';
import { ok, created, clientIp } from '../../lib/http.js';
import * as catalog from '../../services/catalog.service.js';
import * as engagement from '../../services/engagement.service.js';
import { getCms, publicSettings } from '../../services/settings.service.js';
import { locationTree } from '../../data/locations.js';
import { ingestEvent } from '../../services/tracking.service.js';
import { repos } from '../../repositories/index.js';
import { activeFlashSale } from '../../services/catalog.service.js';

type Q = Record<string, never>;

export const publicController = {
  health: (_req: Request, res: Response) => ok(res, { status: 'ok', time: new Date().toISOString() }),

  listProducts: async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    ok(res, await catalog.listProducts(req.query as unknown as catalog.ProductQuery));
  },
  getProduct: async (req: Request, res: Response) => ok(res, await catalog.getProductBySlug(req.params.slug as string)),
  related: async (req: Request, res: Response) => ok(res, await catalog.relatedProducts(req.params.slug as string)),
  suggest: async (req: Request, res: Response) => ok(res, await catalog.suggest(String(req.query.q))),
  slugs: async (_req: Request, res: Response) => {
    const products = await repos.products.find({ status: 'active' });
    ok(res, products.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })));
  },

  categories: async (_req: Request, res: Response) => ok(res, await catalog.listCategories()),
  category: async (req: Request, res: Response) => ok(res, await catalog.getCategory(req.params.slug as string)),

  home: async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    const [cms, sale, featured, newest, bestsellers, categories] = await Promise.all([
      getCms(),
      activeFlashSale(),
      catalog.listProducts({ featured: true, limit: 8 }),
      catalog.listProducts({ sort: 'newest', limit: 8 }),
      catalog.listProducts({ sort: 'popular', limit: 8 }),
      catalog.listCategories(),
    ]);
    const flashItems = sale ? (await catalog.listProducts({ slugs: sale.productSlugs.join(','), limit: 12 })).items : [];
    const { createdAt: _c, updatedAt: _u, _id: _i, ...content } = cms;
    ok(res, { ...content, flashSale: sale ? { title: sale.title, endsAt: sale.endsAt, percent: sale.discountPercent, items: flashItems } : null, featured: featured.items, newArrivals: newest.items, bestsellers: bestsellers.items, categories });
  },

  settings: async (_req: Request, res: Response) => ok(res, await publicSettings()),
  locations: (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    ok(res, locationTree());
  },

  reviews: async (req: Request<{ slug: string }, unknown, unknown, Q>, res: Response) => {
    const q = req.query as unknown as { page?: number; limit?: number; sort?: 'newest' | 'highest' | 'lowest' | 'photos' };
    ok(res, await engagement.listReviews(req.params.slug, q.page, q.limit ?? 6, q.sort));
  },
  createReview: async (req: Request, res: Response) => created(res, await engagement.createReview(req.params.slug as string, req.body)),
  notifyMe: async (req: Request, res: Response) => created(res, await engagement.notifyMe(req.params.slug as string, req.body.phone, req.body.size, req.body.color)),
  subscribe: async (req: Request, res: Response) => created(res, await engagement.subscribe(req.body.contact, req.body.source)),
  contact: async (req: Request, res: Response) => created(res, await engagement.contact(req.body)),
  abandon: async (req: Request, res: Response) => ok(res, await engagement.saveAbandonedCart(req.body)),

  event: async (req: Request, res: Response) => {
    const r = await ingestEvent({ ...req.body, ip: clientIp(req), userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300) });
    ok(res, r);
  },
};

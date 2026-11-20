import type { Request, Response } from 'express';
import { created, ok } from '../../lib/http.js';
import * as svc from '../../services/customer.service.js';

const cid = (req: Request) => req.customerId!;

export const accountController = {
  me: async (req: Request, res: Response) => ok(res, await svc.getProfile(cid(req))),
  updateMe: async (req: Request, res: Response) => ok(res, await svc.updateProfile(cid(req), req.body)),
  orders: async (req: Request, res: Response) => ok(res, await svc.myOrders(cid(req), req.query.status as string | undefined)),
  order: async (req: Request, res: Response) => ok(res, await svc.myOrder(cid(req), req.params.orderNo as string)),
  addAddress: async (req: Request, res: Response) => created(res, await svc.addAddress(cid(req), req.body)),
  updateAddress: async (req: Request, res: Response) => ok(res, await svc.updateAddress(cid(req), req.params.id as string, req.body)),
  deleteAddress: async (req: Request, res: Response) => ok(res, await svc.deleteAddress(cid(req), req.params.id as string)),
  wishlist: async (req: Request, res: Response) => ok(res, await svc.getWishlist(cid(req))),
  addWishlist: async (req: Request, res: Response) => ok(res, await svc.toggleWishlist(cid(req), req.params.id as string, true)),
  removeWishlist: async (req: Request, res: Response) => ok(res, await svc.toggleWishlist(cid(req), req.params.id as string, false)),
};

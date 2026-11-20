import type { Request, Response } from 'express';
import { badRequest } from '../../lib/errors.js';
import { clientIp, created, ok } from '../../lib/http.js';
import { normalizePhone } from '../../utils/text.js';
import { evaluateCoupon, quote } from '../../services/pricing.service.js';
import { sendOtp, verifyOtp } from '../../services/otp.service.js';
import { createOrder, trackOrder } from '../../services/order.service.js';
import * as payments from '../../services/payment.service.js';

const phoneOrThrow = (raw: string) => {
  const p = normalizePhone(raw);
  if (!p) throw badRequest('Please enter a valid Bangladeshi mobile number (01XXXXXXXXX).');
  return p;
};

export const checkoutController = {
  quote: async (req: Request, res: Response) => {
    const body = { ...req.body, phone: req.body.phone ? normalizePhone(req.body.phone) ?? undefined : undefined };
    const q = await quote(body);
    ok(res, { ...q, lines: q.lines.map(({ costPrice: _c, ...l }) => l) });
  },

  coupon: async (req: Request, res: Response) => {
    const q = await quote({ items: req.body.items });
    const valid = q.lines.filter((l) => l.qty > 0);
    const phone = req.body.phone ? normalizePhone(req.body.phone) ?? undefined : undefined;
    ok(res, await evaluateCoupon(req.body.code, valid, q.subtotal, phone));
  },

  sendOtp: async (req: Request, res: Response) => ok(res, await sendOtp(phoneOrThrow(req.body.phone), req.body.purpose)),
  verifyOtp: async (req: Request, res: Response) => {
    const phone = phoneOrThrow(req.body.phone);
    ok(res, await verifyOtp(phone, req.body.purpose, req.body.code));
  },

  createOrder: async (req: Request, res: Response) => {
    const key = String(req.headers['idempotency-key'] ?? '').slice(0, 80) || undefined;
    if (key && !/^[\w-]{8,80}$/.test(key)) throw badRequest('Invalid Idempotency-Key');
    // the customer comes from the verified session cookie (optionalCustomer) — never from the request body/headers
    const c = req.customer;
    const r = await createOrder(
      { ...req.body, customerId: c?._id },
      { verifiedPhone: c?.auth?.phoneVerified ? c.phone : undefined, ip: clientIp(req), userAgent: String(req.headers['user-agent'] ?? '').slice(0, 300), fbp: req.body.fbp, fbc: req.body.fbc, sessionId: req.body.sessionId, idempotencyKey: key },
    );
    created(res, r);
  },

  track: async (req: Request, res: Response) => ok(res, await trackOrder(String(req.query.orderNo), String(req.query.phone))),

  manualPayment: async (req: Request, res: Response) => ok(res, await payments.submitManualPayment(req.params.orderNo as string, req.body.phone, req.body.trxId)),
  initGateway: async (req: Request, res: Response) => ok(res, await payments.initGateway(req.params.orderNo as string, req.body.phone)),
  completeGateway: async (req: Request, res: Response) => ok(res, await payments.completeGateway(req.body.orderNo, req.body.token, req.body.outcome)),
};

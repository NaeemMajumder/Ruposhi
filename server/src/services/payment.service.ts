import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { badRequest, conflict, notFound, unauthorized } from '../lib/errors.js';
import { hmac, normalizePhone, safeEqual } from '../utils/text.js';
import { audit, type Actor } from './audit.service.js';

/**
 * Payments.
 *  • Manual bKash / Nagad: customer sends money, submits the TrxID → admin verifies.
 *  • Gateway (bKash Tokenized / SSLCommerz): DEMO simulation with an HMAC-signed payment token,
 *    so amounts can't be tampered with. Swap `initGateway` for the real create-payment API later.
 */
const TRX_RE = /^[A-Z0-9]{8,14}$/;

const loadOrder = async (orderNo: string, phoneRaw: string) => {
  const phone = normalizePhone(phoneRaw);
  const o = phone ? await repos.orders.findOne({ orderNo, 'customer.phone': phone }) : null;
  if (!o) throw notFound('Order');
  return o;
};

export const submitManualPayment = async (orderNo: string, phone: string, trxIdRaw: string) => {
  const o = await loadOrder(orderNo, phone);
  if (!['bkash_manual', 'nagad_manual'].includes(o.payment.method)) throw badRequest('This order does not use manual payment.');
  if (o.payment.status === 'paid') throw conflict('This order is already paid.');
  const trxId = trxIdRaw.trim().toUpperCase();
  if (!TRX_RE.test(trxId)) throw badRequest('Transaction ID looks invalid. It is 8–14 letters/numbers from your bKash/Nagad SMS.');
  const dup = await repos.orders.findOne({ 'payment.trxId': trxId });
  if (dup && dup.orderNo !== orderNo) throw conflict('This Transaction ID has already been used for another order.');
  await repos.orders.update(o._id, { payment: { ...o.payment, trxId, status: 'pending_verification' } });
  return { orderNo, status: 'pending_verification' };
};

export const verifyManualPayment = async (orderId: string, approve: boolean, actor: Actor) => {
  const o = await repos.orders.findById(orderId);
  if (!o) throw notFound('Order');
  const payment = approve
    ? { ...o.payment, status: 'paid' as const, paidAmount: o.pricing.total }
    : { ...o.payment, status: 'failed' as const };
  await repos.orders.update(o._id, { payment, pricing: { ...o.pricing, advancePaid: approve ? o.pricing.total : 0, due: approve ? 0 : o.pricing.total } });
  await audit(actor, approve ? 'payment.verified' : 'payment.rejected', 'order', o._id, { payment: o.payment.status }, { payment: payment.status, trxId: o.payment.trxId });
  return { orderNo: o.orderNo, payment: payment.status };
};

const signToken = (orderNo: string, amount: number, exp: number) => hmac(config.secrets.payment, `${orderNo}:${amount}:${exp}`);

export const initGateway = async (orderNo: string, phone: string) => {
  const o = await loadOrder(orderNo, phone);
  if (!['bkash', 'sslcommerz'].includes(o.payment.method)) throw badRequest('This order does not use an online gateway.');
  if (o.payment.status === 'paid') throw conflict('This order is already paid.');
  const amount = o.pricing.total - o.payment.paidAmount;
  const exp = Date.now() + 15 * 60_000;
  const token = `${exp}.${signToken(o.orderNo, amount, exp)}`;
  const qs = new URLSearchParams({ gateway: o.payment.method, order: o.orderNo, amount: String(amount), token });
  // relative: the demo gateway page lives on the storefront that asked, whatever its domain (a real gateway returns its own absolute URL)
  return { gateway: o.payment.method, amount, redirectUrl: `/payment/demo?${qs.toString()}`, demo: true };
};

export const completeGateway = async (orderNo: string, token: string, outcome: 'success' | 'failed' | 'cancelled') => {
  const o = await repos.orders.findOne({ orderNo });
  if (!o) throw notFound('Order');
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  const amount = o.pricing.total - o.payment.paidAmount;
  if (!exp || exp < Date.now() || !sig || !safeEqual(sig, signToken(o.orderNo, amount, exp))) throw unauthorized('Payment session expired or invalid.');
  if (o.payment.status === 'paid') return { orderNo, payment: 'paid' };
  if (outcome !== 'success') {
    await repos.orders.update(o._id, { payment: { ...o.payment, status: 'failed' } });
    return { orderNo, payment: 'failed' };
  }
  const gatewayRef = `${o.payment.method === 'bkash' ? 'BK' : 'SSL'}${Date.now().toString(36).toUpperCase()}`;
  await repos.orders.update(o._id, {
    payment: { ...o.payment, status: 'paid', paidAmount: o.pricing.total, gatewayRef, trxId: gatewayRef },
    pricing: { ...o.pricing, advancePaid: o.pricing.total, due: 0 },
    timeline: [...o.timeline, { status: 'payment', at: new Date().toISOString(), by: o.payment.method, note: `Paid online · ${gatewayRef}` }],
  });
  return { orderNo, payment: 'paid', gatewayRef };
};

/** Gateway IPN/webhook — rejects anything without a valid HMAC signature of the raw body. */
export const verifyWebhookSignature = (rawBody: string, signature?: string) => {
  if (!signature) return false;
  return safeEqual(signature, hmac(config.secrets.webhook, rawBody));
};

import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import { badRequest, forbidden, unauthorized } from '../../lib/errors.js';
import * as media from '../../services/media.service.js';
import { ok } from '../../lib/http.js';
import { accountController as acc } from '../controllers/account.controller.js';
import { adminController as adm } from '../controllers/admin.controller.js';
import { checkoutController as chk } from '../controllers/checkout.controller.js';
import { publicController as pub } from '../controllers/public.controller.js';
import { authController as auth } from '../controllers/auth.controller.js';
import { optionalCustomer, requireCustomer } from '../middlewares/customer.js';
import { can, requireAdmin, requirePermission as perm } from '../middlewares/rbac.js';
import { authLimiter, checkoutLimiter, otpLimiter, searchLimiter, writeLimiter } from '../middlewares/security.js';
import { validate } from '../middlewares/validate.js';
import * as v from '../validators/index.js';
import { verifyWebhookSignature } from '../../services/payment.service.js';
import { applyCourierUpdate } from '../../services/order.service.js';

/** Uploads: memory only, 5 MB, whitelisted MIME + extension. */
const upload = (kind: 'xlsx' | 'json') =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      const okXlsx = kind === 'xlsx' && /\.xlsx$/i.test(file.originalname) && /spreadsheetml|octet-stream|zip/.test(file.mimetype);
      const okJson = kind === 'json' && /\.json$/i.test(file.originalname);
      if (okXlsx || okJson) return cb(null, true);
      cb(badRequest(`Only .${kind} files are allowed.`));
    },
  }).single('file');

export const router = Router();

/* ───────────── public storefront ───────────── */
// friendly index for anyone opening the API base URL in a browser
router.get('/', (_req, res) => {
  res.json({ success: true, data: { name: 'Ruposhi API', version: 'v1', status: 'ok', docs: 'See README.md', try: ['/api/v1/health', '/api/v1/products', '/api/v1/home', '/api/v1/categories'] } });
});
router.get('/health', pub.health);
router.get('/home', pub.home);
router.get('/settings/public', pub.settings);
router.get('/locations', pub.locations);
router.get('/categories', pub.categories);
router.get('/categories/:slug', validate(v.slugParam, 'params'), pub.category);
router.get('/products', validate(v.productListQuery, 'query'), pub.listProducts);
router.get('/products/slugs', pub.slugs);
router.get('/products/:slug', validate(v.slugParam, 'params'), pub.getProduct);
router.get('/products/:slug/related', validate(v.slugParam, 'params'), pub.related);
router.get('/products/:slug/reviews', validate(v.slugParam, 'params'), validate(v.reviewsQuery, 'query'), pub.reviews);
router.post('/products/:slug/reviews', writeLimiter, validate(v.slugParam, 'params'), validate(v.reviewBody), pub.createReview);
router.post('/products/:slug/notify', writeLimiter, validate(v.slugParam, 'params'), validate(v.notifyBody), pub.notifyMe);
router.get('/search/suggest', searchLimiter, validate(v.suggestQuery, 'query'), pub.suggest);
router.post('/newsletter', writeLimiter, validate(v.subscribeBody), pub.subscribe);
router.post('/contact', writeLimiter, validate(v.contactBody), pub.contact);
router.post('/cart/abandon', writeLimiter, validate(v.abandonBody), pub.abandon);
router.post('/track/events', validate(v.eventBody), pub.event);

/* ───────────── cart / checkout / orders / payments ───────────── */
router.post('/cart/quote', validate(v.quoteBody), chk.quote);
router.post('/coupons/validate', writeLimiter, validate(v.couponBody), chk.coupon);
router.post('/otp/send', otpLimiter, validate(v.otpSendBody), chk.sendOtp);
router.post('/otp/verify', otpLimiter, validate(v.otpVerifyBody), chk.verifyOtp);
router.post('/orders', checkoutLimiter, optionalCustomer, validate(v.createOrderBody), chk.createOrder);
router.get('/orders/track', searchLimiter, validate(v.trackQuery, 'query'), chk.track);
router.post('/payments/:orderNo/manual', writeLimiter, validate(v.manualPaymentBody), chk.manualPayment);
router.post('/payments/:orderNo/init', writeLimiter, validate(v.gatewayInitBody), chk.initGateway);
router.post('/payments/demo/complete', writeLimiter, validate(v.gatewayCompleteBody), chk.completeGateway);

/* ───────────── webhooks (HMAC-signed raw body) ───────────── */
router.post('/webhooks/courier/:provider', validate(v.courierWebhookBody), async (req, res) => {
  const raw = (req as unknown as { rawBody?: string }).rawBody ?? '';
  if (!verifyWebhookSignature(raw, String(req.headers['x-signature'] ?? ''))) throw unauthorized('Invalid webhook signature');
  ok(res, await applyCourierUpdate(req.body.consignmentId, req.body.status));
});

/* ───────────── authentication (Passport.js · httpOnly cookies) ───────────── */
router.post('/auth/register/check', authLimiter, validate(v.registerCheckBody), auth.check);
router.post('/auth/register', authLimiter, validate(v.registerBody), auth.register);
router.post('/auth/login', authLimiter, validate(v.loginBody), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', optionalCustomer, auth.me);
router.post('/auth/password/forgot', otpLimiter, validate(v.forgotBody), auth.forgot);
router.post('/auth/password/reset', authLimiter, validate(v.resetBody), auth.reset);
router.post('/auth/password/change', authLimiter, requireCustomer, validate(v.changePasswordBody), auth.changePassword);
router.post('/auth/email', authLimiter, requireCustomer, validate(v.changeEmailBody), auth.changeEmail);
router.post('/auth/logout-all', requireCustomer, auth.logoutAll);

router.post('/admin/auth/login', authLimiter, validate(v.staffLoginBody), auth.staffLogin);

/* ───────────── customer account ───────────── */
const me = Router();
me.use(requireCustomer);
me.get('/', acc.me);
me.patch('/', validate(v.profileBody), acc.updateMe);
me.get('/orders', validate(v.ordersQuery, 'query'), acc.orders);
me.get('/orders/:orderNo', acc.order);
me.post('/addresses', validate(v.addressBody), acc.addAddress);
me.patch('/addresses/:id', validate(v.idParam, 'params'), validate(v.addressPatchBody), acc.updateAddress);
me.delete('/addresses/:id', validate(v.idParam, 'params'), acc.deleteAddress);
me.get('/wishlist', acc.wishlist);
me.post('/wishlist/:id', validate(v.idParam, 'params'), acc.addWishlist);
me.delete('/wishlist/:id', validate(v.idParam, 'params'), acc.removeWishlist);
router.use('/me', me);

/* ───────────── admin (RBAC) ───────────── */
const a = Router();
a.use(requireAdmin);
a.get('/me', adm.me);
a.post('/auth/logout', auth.staffLogout);
a.post('/auth/password', authLimiter, validate(v.changePasswordBody), auth.staffPassword);

// image uploads (Cloudinary signed direct upload) — product editors and content editors
const canUpload = (req: Request, _res: Response, next: NextFunction) =>
  req.admin && (can(req.admin.role, 'products.edit') || can(req.admin.role, 'cms.edit')) ? next() : next(forbidden('Your role cannot upload images'));
a.get('/media/config', (_req, res) => ok(res, media.mediaConfig()));
a.post('/media/sign', writeLimiter, canUpload, validate(v.mediaSignBody), (req, res) => ok(res, media.signUpload(req.body.kind)));
a.get('/dashboard', perm('dashboard.view'), validate(v.dashboardQuery, 'query'), adm.dashboard);
a.get('/dashboard/export', perm('reports.view'), validate(v.dashboardQuery, 'query'), adm.dashboardExport);
a.get('/reports/:type', perm('reports.view'), validate(v.reportParam, 'params'), validate(v.reportQuery, 'query'), adm.report);
a.get('/reports/:type/export', perm('reports.view'), validate(v.reportParam, 'params'), validate(v.reportQuery, 'query'), adm.reportExport);

a.get('/orders', perm('orders.view'), validate(v.adminOrdersQuery, 'query'), adm.orders);
a.get('/orders/export', perm('orders.export'), validate(v.adminOrdersQuery, 'query'), adm.ordersExport);
a.post('/orders/bulk-status', perm('orders.update'), validate(v.bulkStatusBody), adm.ordersBulkStatus);
a.get('/fraud-check', perm('orders.view'), adm.fraud);
a.get('/orders/:id', perm('orders.view'), validate(v.idParam, 'params'), adm.order);
a.patch('/orders/:id/status', perm('orders.update'), validate(v.idParam, 'params'), validate(v.statusBody), adm.orderStatus);
a.post('/orders/:id/notes', perm('orders.update'), validate(v.idParam, 'params'), validate(v.noteBody), adm.orderNote);
a.patch('/orders/:id/items', perm('orders.update'), validate(v.idParam, 'params'), validate(v.editItemsBody), adm.orderItems);
a.post('/orders/:id/courier', perm('orders.update'), validate(v.idParam, 'params'), validate(v.courierBody), adm.orderCourier);
a.post('/orders/:id/verify-payment', perm('orders.update'), validate(v.idParam, 'params'), validate(v.verifyPaymentBody), adm.orderVerifyPayment);
a.post('/orders/:id/call-confirm', perm('orders.update'), validate(v.idParam, 'params'), validate(v.callConfirmBody), adm.orderCallConfirm);

a.get('/products', perm('products.view'), validate(v.adminProductsQuery, 'query'), adm.products);
a.get('/products/export', perm('products.view'), validate(v.adminProductsQuery, 'query'), adm.productsExport);
a.post('/products/import', perm('products.price'), upload('xlsx'), adm.productsImport);
a.post('/products/bulk-price', perm('products.price'), validate(v.bulkPriceBody), adm.bulkPrice);
a.post('/products', perm('products.edit'), validate(v.productBody), adm.createProduct);
a.get('/products/:id', perm('products.view'), validate(v.idParam, 'params'), adm.product);
a.patch('/products/:id', perm('products.edit'), validate(v.idParam, 'params'), validate(v.productPatchBody), (req, res, next) => {
  // changing money fields needs the price permission
  if (['price', 'compareAtPrice', 'costPrice'].some((k) => k in req.body)) return perm('products.price')(req, res, next);
  next();
}, adm.updateProduct);
a.delete('/products/:id', perm('products.delete'), validate(v.idParam, 'params'), adm.archiveProduct);
a.post('/products/:id/duplicate', perm('products.edit'), validate(v.idParam, 'params'), adm.duplicateProduct);

a.get('/categories', perm('products.view'), adm.categories);
a.post('/categories', perm('products.edit'), validate(v.categoryBody), adm.createCategory);
a.patch('/categories/:id', perm('products.edit'), validate(v.idParam, 'params'), validate(v.categoryBody), adm.updateCategory);
a.delete('/categories/:id', perm('products.delete'), validate(v.idParam, 'params'), adm.deleteCategory);

a.get('/inventory', perm('products.view'), validate(v.inventoryQuery, 'query'), adm.inventory);
a.get('/inventory/export', perm('products.view'), validate(v.inventoryQuery, 'query'), adm.inventoryExport);
a.post('/inventory/adjust', perm('inventory.edit'), validate(v.inventoryAdjustBody), adm.inventoryAdjust);
a.get('/inventory/logs', perm('products.view'), validate(v.inventoryLogsQuery, 'query'), adm.inventoryLogs);
a.get('/inventory/logs/export', perm('products.view'), validate(v.inventoryLogsQuery, 'query'), adm.inventoryLogsExport);

a.get('/customers', perm('customers.view'), validate(v.customersQuery, 'query'), adm.customers);
a.get('/customers/export', perm('customers.view'), validate(v.customersQuery, 'query'), adm.customersExport);
a.get('/customers/:id', perm('customers.view'), validate(v.idParam, 'params'), adm.customer);
a.patch('/customers/:id', perm('customers.edit'), validate(v.idParam, 'params'), validate(v.customerPatchBody), adm.updateCustomer);

a.get('/coupons', perm('marketing.manage'), adm.coupons);
a.get('/coupons/export', perm('marketing.manage'), adm.couponsExport);
a.post('/coupons', perm('marketing.manage'), validate(v.couponBodyAdmin), adm.createCoupon);
a.patch('/coupons/:id', perm('marketing.manage'), validate(v.idParam, 'params'), validate(v.couponBodyAdmin), adm.updateCoupon);
a.delete('/coupons/:id', perm('marketing.manage'), validate(v.idParam, 'params'), adm.deleteCoupon);
a.get('/flash-sales', perm('marketing.manage'), adm.flashSales);
a.post('/flash-sales', perm('marketing.manage'), validate(v.flashSaleBody), adm.createFlashSale);
a.patch('/flash-sales/:id', perm('marketing.manage'), validate(v.idParam, 'params'), validate(v.flashSaleBody), adm.updateFlashSale);
a.delete('/flash-sales/:id', perm('marketing.manage'), validate(v.idParam, 'params'), adm.deleteFlashSale);

a.get('/reviews', perm('products.view'), validate(v.reviewsAdminQuery, 'query'), adm.reviews);
a.patch('/reviews/:id', perm('marketing.manage'), validate(v.idParam, 'params'), validate(v.moderateBody), adm.moderateReview);
a.delete('/reviews/:id', perm('marketing.manage'), validate(v.idParam, 'params'), adm.deleteReview);

a.get('/cms', perm('cms.edit'), adm.cms);
a.put('/cms', perm('cms.edit'), validate(v.cmsBody), adm.updateCms);
a.get('/settings', perm('settings.edit'), adm.settings);
a.put('/settings', perm('settings.edit'), validate(v.settingsBody), adm.updateSettings);
a.get('/staff', perm('staff.manage'), adm.staff);
a.post('/staff', perm('staff.manage'), validate(v.staffBody), adm.createStaff);
a.patch('/staff/:id', perm('staff.manage'), validate(v.idParam, 'params'), validate(v.staffBody), adm.updateStaff);

a.get('/marketing/abandoned', perm('marketing.manage'), validate(v.abandonedQuery, 'query'), adm.abandoned);
a.post('/marketing/abandoned/:id/remind', perm('marketing.manage'), validate(v.idParam, 'params'), adm.remindAbandoned);
a.post('/marketing/campaigns', perm('marketing.manage'), validate(v.campaignBody), adm.campaign);
a.get('/marketing/sms-logs', perm('marketing.manage'), validate(v.smsLogsQuery, 'query'), adm.smsLogs);
a.get('/marketing/subscribers', perm('marketing.manage'), validate(v.listQuery, 'query'), adm.subscribers);
a.get('/marketing/subscribers/export', perm('marketing.manage'), adm.subscribersExport);
a.get('/marketing/contacts', perm('customers.view'), adm.contacts);
a.patch('/marketing/contacts/:id', perm('customers.edit'), validate(v.idParam, 'params'), validate(v.contactPatchBody), adm.updateContact);
a.get('/marketing/stock-alerts', perm('products.view'), adm.stockAlerts);

a.get('/audit', perm('audit.view'), validate(v.auditQuery, 'query'), adm.audit);
a.get('/audit/export', perm('audit.view'), validate(v.auditQuery, 'query'), adm.auditExport);
a.get('/tracking/events', perm('reports.view'), validate(v.eventsQuery, 'query'), adm.events);

a.get('/backup/xlsx', perm('backup.manage'), adm.backupXlsx);
a.get('/backup/json', perm('backup.manage'), adm.backupJson);
a.post('/backup/restore', perm('backup.manage'), upload('json'), adm.restore);
router.use('/admin', a);

import type { Request, Response } from 'express';
import { badRequest, notFound } from '../../lib/errors.js';
import { clientIp, created, ok, sendFile, XLSX_MIME } from '../../lib/http.js';
import { repos } from '../../repositories/index.js';
import * as admin from '../../services/admin.service.js';
import * as analytics from '../../services/analytics.service.js';
import * as excel from '../../services/excel.service.js';
import { bookCourier, changeStatus, fraudCheck } from '../../services/order.service.js';
import { verifyManualPayment } from '../../services/payment.service.js';
import { getCms, getSettings } from '../../services/settings.service.js';
import { permissionsFor } from '../middlewares/rbac.js';
import type { Actor } from '../../services/audit.service.js';

const actor = (req: Request): Actor & { id: string } => ({ id: req.admin!.id, name: req.admin!.name, role: req.admin!.role, ip: clientIp(req) });
const q = <T,>(req: Request) => req.query as unknown as T;
const pid = (req: Request) => req.params.id as string;
const stamp = () => new Date().toISOString().slice(0, 10);
const xlsx = async (res: Response, name: string, rows: excel.Row[], columns?: string[]) =>
  sendFile(res, await excel.toXlsx([{ name, rows, columns }]), `ruposhi-${name}-${stamp()}.xlsx`, XLSX_MIME);
const ALL = { page: 1, limit: 100000 };

export const adminController = {
  /* session */
  me: (req: Request, res: Response) => ok(res, { ...req.admin, permissions: permissionsFor(req.admin!.role) }),

  /* dashboard + reports */
  dashboard: async (req: Request, res: Response) => ok(res, await analytics.dashboard(q<{ from?: string }>(req).from, q<{ to?: string }>(req).to)),
  dashboardExport: async (req: Request, res: Response) => {
    const d = await analytics.dashboard(q<{ from?: string }>(req).from, q<{ to?: string }>(req).to);
    const buf = await excel.toXlsx([
      { name: 'KPIs', rows: Object.entries(d.kpis).map(([metric, v]) => ({ metric, value: v.value, changeVsPreviousPct: v.change })) },
      { name: 'Daily', rows: d.series },
      { name: 'Status', rows: d.statusBreakdown },
      { name: 'Payments', rows: d.paymentBreakdown },
      { name: 'Categories', rows: d.categoryBreakdown },
      { name: 'Channels', rows: d.channelBreakdown },
      { name: 'Top products', rows: d.topProducts.map(({ image: _i, ...r }) => r) },
      { name: 'Low stock', rows: d.lowStock },
    ]);
    sendFile(res, buf, `ruposhi-dashboard-${d.range.from}_to_${d.range.to}.xlsx`, XLSX_MIME);
  },
  report: async (req: Request, res: Response) => {
    const { from, to, groupBy } = q<{ from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' }>(req);
    ok(res, await analytics.report(req.params.type as analytics.ReportType, from, to, groupBy));
  },
  reportExport: async (req: Request, res: Response) => {
    const { from, to, groupBy } = q<{ from?: string; to?: string; groupBy?: 'day' | 'week' | 'month' }>(req);
    const r = await analytics.report(req.params.type as analytics.ReportType, from, to, groupBy);
    await xlsx(res, `report-${req.params.type}`, r.rows as excel.Row[], r.columns);
  },

  /* orders */
  orders: async (req: Request, res: Response) => ok(res, await admin.listOrders(q(req))),
  ordersExport: async (req: Request, res: Response) => {
    const r = await admin.listOrders({ ...q<admin.OrderFilters>(req), ...ALL });
    await xlsx(res, 'orders', admin.orderRows(r.items));
  },
  order: async (req: Request, res: Response) => ok(res, await admin.getOrder(pid(req))),
  orderStatus: async (req: Request, res: Response) => ok(res, await changeStatus(pid(req), req.body.status, actor(req), req.body.note)),
  orderNote: async (req: Request, res: Response) => ok(res, await admin.addOrderNote(pid(req), req.body.text, actor(req))),
  orderItems: async (req: Request, res: Response) => ok(res, await admin.editOrderItems(pid(req), req.body.items, actor(req))),
  orderCourier: async (req: Request, res: Response) => ok(res, await bookCourier(pid(req), req.body.courier, actor(req))),
  orderVerifyPayment: async (req: Request, res: Response) => ok(res, await verifyManualPayment(pid(req), req.body.approve, actor(req))),
  orderCallConfirm: async (req: Request, res: Response) => ok(res, await admin.setCallConfirmed(pid(req), req.body.value, actor(req))),
  ordersBulkStatus: async (req: Request, res: Response) => ok(res, await admin.bulkStatus(req.body.ids, req.body.status, actor(req))),
  fraud: async (req: Request, res: Response) => ok(res, await fraudCheck(String(req.query.phone ?? ''))),

  /* products */
  products: async (req: Request, res: Response) => ok(res, await admin.adminListProducts(q(req))),
  productsExport: async (req: Request, res: Response) => {
    const r = await admin.adminListProducts({ ...q<admin.ProductFilters>(req), ...ALL });
    await xlsx(res, 'products', excel.productRows(r.items), excel.PRODUCT_COLUMNS);
  },
  productsImport: async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('Upload an .xlsx file in the "file" field.');
    ok(res, await excel.importProducts(req.file.buffer, actor(req)));
  },
  product: async (req: Request, res: Response) => ok(res, await admin.getProductAdmin(pid(req))),
  createProduct: async (req: Request, res: Response) => created(res, await admin.createProduct(req.body, actor(req))),
  updateProduct: async (req: Request, res: Response) => ok(res, await admin.updateProduct(pid(req), req.body, actor(req))),
  archiveProduct: async (req: Request, res: Response) => ok(res, await admin.archiveProduct(pid(req), actor(req))),
  duplicateProduct: async (req: Request, res: Response) => created(res, await admin.duplicateProduct(pid(req), actor(req))),
  bulkPrice: async (req: Request, res: Response) => ok(res, await admin.bulkPrice(req.body, actor(req))),

  /* categories */
  categories: async (_req: Request, res: Response) => ok(res, await repos.categories.find({}, { sort: { sortOrder: 1 } })),
  createCategory: async (req: Request, res: Response) => created(res, await admin.upsertCategory(req.body, actor(req))),
  updateCategory: async (req: Request, res: Response) => ok(res, await admin.upsertCategory(req.body, actor(req), pid(req))),
  deleteCategory: async (req: Request, res: Response) => ok(res, await admin.deleteCategory(pid(req), actor(req))),

  /* inventory */
  inventory: async (req: Request, res: Response) => ok(res, await admin.inventoryList(q(req))),
  inventoryExport: async (req: Request, res: Response) => {
    const r = await admin.inventoryList({ ...q<{ q?: string }>(req), ...ALL });
    await xlsx(res, 'inventory', r.items.map(({ image: _i, productId: _p, ...row }) => row));
  },
  inventoryAdjust: async (req: Request, res: Response) => ok(res, await admin.inventoryAdjust(req.body, actor(req))),
  inventoryLogs: async (req: Request, res: Response) => ok(res, await admin.inventoryLogs(q(req))),
  inventoryLogsExport: async (req: Request, res: Response) => {
    const r = await admin.inventoryLogs({ ...q<{ q?: string }>(req), ...ALL });
    await xlsx(res, 'inventory-log', r.items.map(({ _id: _i, updatedAt: _u, ...row }) => row));
  },

  /* customers */
  customers: async (req: Request, res: Response) => ok(res, await admin.listCustomers(q(req))),
  customersExport: async (req: Request, res: Response) => {
    const r = await admin.listCustomers({ ...q<{ q?: string }>(req), ...ALL });
    await xlsx(res, 'customers', admin.customerRows(r.items));
  },
  customer: async (req: Request, res: Response) => ok(res, await admin.getCustomerAdmin(pid(req))),
  updateCustomer: async (req: Request, res: Response) => ok(res, await admin.updateCustomerAdmin(pid(req), req.body, actor(req))),

  /* coupons + flash sales */
  coupons: async (_req: Request, res: Response) => ok(res, await repos.coupons.find({}, { sort: { createdAt: -1 } })),
  couponsExport: async (_req: Request, res: Response) => {
    const rows = (await repos.coupons.find({})).map((c) => ({ code: c.code, type: c.type, value: c.value, maxDiscount: c.maxDiscount ?? '', minOrder: c.minOrder, used: c.usedCount, active: c.isActive ? 'yes' : 'no', endsAt: c.endsAt?.slice(0, 10) ?? '' }));
    await xlsx(res, 'coupons', rows);
  },
  createCoupon: async (req: Request, res: Response) => created(res, await admin.upsertCoupon(req.body, actor(req))),
  updateCoupon: async (req: Request, res: Response) => ok(res, await admin.upsertCoupon(req.body, actor(req), pid(req))),
  deleteCoupon: async (req: Request, res: Response) => {
    if (!(await repos.coupons.delete(pid(req)))) throw notFound('Coupon');
    ok(res, { deleted: true });
  },
  flashSales: async (_req: Request, res: Response) => ok(res, await repos.flashSales.find({}, { sort: { startsAt: -1 } })),
  createFlashSale: async (req: Request, res: Response) => created(res, await admin.upsertFlashSale(req.body, actor(req))),
  updateFlashSale: async (req: Request, res: Response) => ok(res, await admin.upsertFlashSale(req.body, actor(req), pid(req))),
  deleteFlashSale: async (req: Request, res: Response) => {
    if (!(await repos.flashSales.delete(pid(req)))) throw notFound('Flash sale');
    ok(res, { deleted: true });
  },

  /* reviews */
  reviews: async (req: Request, res: Response) => ok(res, await admin.listReviewsAdmin(q(req))),
  moderateReview: async (req: Request, res: Response) => ok(res, await admin.moderateReview(pid(req), req.body, actor(req))),
  deleteReview: async (req: Request, res: Response) => {
    if (!(await repos.reviews.delete(pid(req)))) throw notFound('Review');
    ok(res, { deleted: true });
  },

  /* cms + settings + staff */
  cms: async (_req: Request, res: Response) => ok(res, await getCms()),
  updateCms: async (req: Request, res: Response) => ok(res, await admin.updateCms(req.body, actor(req))),
  settings: async (_req: Request, res: Response) => ok(res, await getSettings()),
  updateSettings: async (req: Request, res: Response) => ok(res, await admin.updateSettings(req.body, actor(req))),
  staff: async (_req: Request, res: Response) => ok(res, await admin.listStaff()),
  createStaff: async (req: Request, res: Response) => created(res, await admin.upsertStaff(req.body, actor(req))),
  updateStaff: async (req: Request, res: Response) => ok(res, await admin.upsertStaff(req.body, actor(req), pid(req))),

  /* marketing */
  abandoned: async (req: Request, res: Response) => ok(res, await admin.abandonedList(q(req))),
  remindAbandoned: async (req: Request, res: Response) => ok(res, await admin.remindAbandoned(pid(req), actor(req))),
  campaign: async (req: Request, res: Response) => ok(res, await admin.sendCampaign(req.body, actor(req))),
  smsLogs: async (req: Request, res: Response) => ok(res, await admin.smsLogs(q(req))),
  subscribers: async (req: Request, res: Response) => {
    const rows = await repos.subscribers.find({}, { sort: { createdAt: -1 } });
    const { page = 1, limit = 30 } = q<{ page?: number; limit?: number }>(req);
    ok(res, { items: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit, pages: Math.max(1, Math.ceil(rows.length / limit)) });
  },
  subscribersExport: async (_req: Request, res: Response) =>
    xlsx(res, 'subscribers', (await repos.subscribers.find({})).map((s) => ({ contact: s.contact, source: s.source, date: s.createdAt.slice(0, 10) }))),
  contacts: async (_req: Request, res: Response) => ok(res, await repos.contacts.find({}, { sort: { createdAt: -1 } })),
  updateContact: async (req: Request, res: Response) => ok(res, await repos.contacts.update(pid(req), { status: req.body.status })),
  stockAlerts: async (_req: Request, res: Response) => ok(res, await repos.stockAlerts.find({}, { sort: { createdAt: -1 } })),

  /* logs */
  audit: async (req: Request, res: Response) => ok(res, await admin.auditList(q(req))),
  auditExport: async (req: Request, res: Response) => {
    const r = await admin.auditList({ ...q<{ q?: string }>(req), ...ALL });
    await xlsx(res, 'audit-log', r.items.map((a) => ({ date: a.createdAt.replace('T', ' ').slice(0, 19), actor: a.actor, role: a.role, action: a.action, entity: a.entity, entityId: a.entityId, before: JSON.stringify(a.before ?? ''), after: JSON.stringify(a.after ?? ''), ip: a.ip ?? '' })));
  },
  events: async (req: Request, res: Response) => ok(res, await admin.eventsList(q(req))),

  /* backup */
  backupXlsx: async (_req: Request, res: Response) => sendFile(res, await excel.backupXlsx(), `ruposhi-backup-${stamp()}.xlsx`, XLSX_MIME),
  backupJson: async (_req: Request, res: Response) => sendFile(res, Buffer.from(JSON.stringify(await excel.backupJson())), `ruposhi-backup-${stamp()}.json`, 'application/json'),
  restore: async (req: Request, res: Response) => {
    if (!req.file) throw badRequest('Upload a .json backup in the "file" field.');
    let parsed: unknown;
    try {
      parsed = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      throw badRequest('Backup file is not valid JSON.');
    }
    ok(res, await excel.restoreJson(parsed, actor(req)));
  },
};

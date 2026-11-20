import ExcelJS from 'exceljs';
import { repos, type CollectionName } from '../repositories/index.js';
import { badRequest } from '../lib/errors.js';
import type { Product } from '../types/domain.js';
import { audit, type Actor } from './audit.service.js';
import { adjustStock } from './order.service.js';

export type Row = Record<string, string | number | boolean | null | undefined>;

const GOLD = 'FFC9A07A';
const ESPRESSO = 'FF2C1810';

const titleCase = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (c) => c.toUpperCase()).trim();

/** Adds a styled, filterable, frozen-header sheet. */
const addSheet = (wb: ExcelJS.Workbook, name: string, rows: Row[], columns?: string[]) => {
  const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  ws.columns = cols.map((key) => ({
    header: titleCase(key),
    key,
    width: Math.min(48, Math.max(12, titleCase(key).length + 2, ...rows.slice(0, 200).map((r) => String(r[key] ?? '').length + 2))),
  }));
  rows.forEach((r) => ws.addRow(r));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFF9F5' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESPRESSO } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;
  header.eachCell((c) => (c.border = { bottom: { style: 'thin', color: { argb: GOLD } } }));
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  return ws;
};

export const toXlsx = async (sheets: { name: string; rows: Row[]; columns?: string[] }[]) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ruposhi Admin';
  wb.created = new Date();
  for (const s of sheets) addSheet(wb, s.name, s.rows, s.columns);
  return Buffer.from(await wb.xlsx.writeBuffer());
};

/** Reads the first sheet of an uploaded workbook into objects keyed by normalised header. */
export const readXlsx = async (buf: Buffer): Promise<Row[]> => {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw badRequest('Could not read the file. Please upload a valid .xlsx file.');
  }
  const ws = wb.worksheets[0];
  if (!ws) throw badRequest('The workbook has no sheets.');
  const headers: string[] = [];
  ws.getRow(1).eachCell((c, i) => (headers[i] = String(c.value ?? '').trim().toLowerCase().replace(/\s+/g, '')));
  const rows: Row[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const obj: Row = {};
    row.eachCell({ includeEmpty: true }, (c, i) => {
      const v = c.value as unknown;
      obj[headers[i]] = v && typeof v === 'object' && 'result' in (v as object) ? ((v as { result: string }).result) : (v as string | number | null);
    });
    if (Object.values(obj).some((v) => v !== null && v !== '' && v !== undefined)) rows.push(obj);
  });
  return rows;
};

/* ───────────────────────── products: editable round-trip ───────────────────────── */

/** One row per variant — edit price/stock/status in Excel and upload back. */
export const productRows = (products: Product[]): Row[] =>
  products.flatMap((p) =>
    p.variants.map((v) => ({
      variantSku: v.sku, productSlug: p.slug, productSku: p.sku, nameEn: p.name.en, nameBn: p.name.bn, category: p.category, fabric: p.fabric,
      color: v.color, size: v.size, price: p.price, compareAtPrice: p.compareAtPrice ?? '', costPrice: p.costPrice, stock: v.stock,
      status: p.status, featured: p.isFeatured ? 'yes' : 'no', preOrder: p.preOrder ? 'yes' : 'no',
    })),
  );

export const PRODUCT_COLUMNS = ['variantSku', 'productSlug', 'productSku', 'nameEn', 'nameBn', 'category', 'fabric', 'color', 'size', 'price', 'compareAtPrice', 'costPrice', 'stock', 'status', 'featured', 'preOrder'];

const num = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

export const importProducts = async (buf: Buffer, actor: Actor) => {
  const rows = await readXlsx(buf);
  if (!rows.length) throw badRequest('The sheet is empty.');
  if (rows.length > 5000) throw badRequest('Too many rows (max 5,000).');
  const products = await repos.products.find({});
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const result = { productsUpdated: 0, stockChanges: 0, skipped: 0, errors: [] as { row: number; error: string }[] };
  const productPatches = new Map<string, Partial<Product>>();

  rows.forEach((r, idx) => {
    const rowNo = idx + 2;
    const slug = String(r.productslug ?? '').trim();
    const sku = String(r.variantsku ?? '').trim();
    const p = bySlug.get(slug);
    if (!p) return result.errors.push({ row: rowNo, error: `Unknown productSlug "${slug}"` });
    const v = p.variants.find((x) => x.sku === sku);
    if (!v) return result.errors.push({ row: rowNo, error: `Unknown variantSku "${sku}" for ${slug}` });
    const price = num(r.price);
    const compare = num(r.compareatprice);
    const cost = num(r.costprice);
    const stock = num(r.stock);
    for (const [k, val] of Object.entries({ price, compareAtPrice: compare, costPrice: cost, stock })) {
      if (val !== undefined && (!Number.isFinite(val) || val < 0 || !Number.isInteger(val))) return result.errors.push({ row: rowNo, error: `${k} must be a whole number ≥ 0` });
    }
    const status = String(r.status ?? p.status).trim().toLowerCase();
    if (!['active', 'draft', 'archived'].includes(status)) return result.errors.push({ row: rowNo, error: `status must be active, draft or archived` });
    if (!productPatches.has(slug)) {
      const patch: Partial<Product> = {};
      if (price !== undefined && price !== p.price) patch.price = price;
      if (compare !== undefined && compare !== p.compareAtPrice) patch.compareAtPrice = compare || undefined;
      if (cost !== undefined && cost !== p.costPrice) patch.costPrice = cost;
      if (status !== p.status) patch.status = status as Product['status'];
      const nameEn = String(r.nameen ?? '').trim();
      const nameBn = String(r.namebn ?? '').trim();
      if ((nameEn && nameEn !== p.name.en) || (nameBn && nameBn !== p.name.bn)) patch.name = { en: nameEn || p.name.en, bn: nameBn || p.name.bn };
      if (r.featured !== undefined && r.featured !== null) {
        const featured = String(r.featured).toLowerCase() === 'yes';
        if (featured !== p.isFeatured) patch.isFeatured = featured;
      }
      productPatches.set(slug, patch);
    }
    if (stock !== undefined && stock !== v.stock) {
      result.stockChanges++;
      (productPatches.get(slug) as Record<string, unknown>).__stock = [...(((productPatches.get(slug) as Record<string, unknown>).__stock as unknown[]) ?? []), { sku, delta: stock - v.stock }];
    }
  });

  for (const [slug, patchRaw] of productPatches) {
    const { __stock, ...patch } = patchRaw as Partial<Product> & { __stock?: { sku: string; delta: number }[] };
    const p = bySlug.get(slug)!;
    if (Object.keys(patch).length) {
      await repos.products.update(p._id, patch);
      await audit(actor, 'product.excel_import', 'product', p._id, Object.fromEntries(Object.keys(patch).map((k) => [k, (p as unknown as Record<string, unknown>)[k]])), patch);
      result.productsUpdated++;
    }
    for (const s of __stock ?? []) await adjustStock(slug, s.sku, s.delta, 'excel_import', actor.name);
  }
  result.skipped = result.errors.length;
  return result;
};

/* ───────────────────────── backup ───────────────────────── */

const BACKUP_COLLECTIONS: CollectionName[] = ['products', 'categories', 'orders', 'customers', 'coupons', 'reviews', 'flashSales', 'settings', 'cms', 'staff', 'subscribers', 'contacts', 'abandonedCarts', 'stockAlerts', 'inventoryLogs', 'auditLogs', 'smsLogs'];

const flatten = (doc: Record<string, unknown>): Row =>
  Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, v !== null && typeof v === 'object' ? JSON.stringify(v) : (v as Row[string])]));

/** Full store backup as an Excel workbook (one sheet per collection) — human-readable archive. */
export const backupXlsx = async () => {
  const sheets = [];
  for (const name of BACKUP_COLLECTIONS) {
    const docs = await repos[name].find({});
    // password hashes stay out of the spreadsheet archive (the JSON backup keeps them so a restore keeps logins working)
    sheets.push({ name, rows: docs.map(({ auth: _a, ...d }: { auth?: unknown }) => flatten(d as Record<string, unknown>)) });
  }
  return toXlsx(sheets);
};

/** Full store backup as JSON — exact, restorable. */
export const backupJson = async () => {
  const out: Record<string, unknown[]> = {};
  for (const name of BACKUP_COLLECTIONS) out[name] = await repos[name].find({});
  return { app: 'ruposhi', version: 1, exportedAt: new Date().toISOString(), collections: out };
};

export const restoreJson = async (payload: unknown, actor: Actor) => {
  const p = payload as { app?: string; collections?: Record<string, unknown[]> };
  if (p?.app !== 'ruposhi' || !p.collections || typeof p.collections !== 'object') throw badRequest('This is not a Ruposhi backup file.');
  const restored: Record<string, number> = {};
  for (const name of BACKUP_COLLECTIONS) {
    const docs = p.collections[name];
    if (!Array.isArray(docs)) continue;
    if (!docs.every((d) => d && typeof d === 'object' && typeof (d as { _id?: unknown })._id === 'string')) throw badRequest(`Invalid documents in "${name}".`);
    await repos[name].replaceAll(docs as never[]);
    restored[name] = docs.length;
  }
  await audit(actor, 'backup.restored', 'system', 'backup', null, restored);
  return restored;
};

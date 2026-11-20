import { repos } from '../repositories/index.js';
import { dateRange } from '../lib/http.js';
import type { Order } from '../types/domain.js';
import { getSettings } from './settings.service.js';

const isCounted = (o: Order) => o.status !== 'cancelled';
const sum = <T,>(a: T[], f: (x: T) => number) => a.reduce((s, x) => s + f(x), 0);
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);
const dayKey = (iso: string) => iso.slice(0, 10);

const ordersBetween = async (startIso: string, endIso: string, extra: Record<string, unknown> = {}) =>
  repos.orders.find({ createdAt: { $gte: startIso, $lte: endIso }, ...extra });

const groupSum = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => number) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + val(r));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

const profitOf = (o: Order) => sum(o.items, (i) => (i.price - i.costPrice) * i.qty) - o.pricing.discount;

/** Everything the admin dashboard needs, for any date range, with previous-period comparison. */
export const dashboard = async (from?: string, to?: string) => {
  const { start, end, startIso, endIso } = dateRange(from, to, 30);
  const spanMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - spanMs - 1).toISOString();
  const prevEnd = new Date(start.getTime() - 1).toISOString();

  const [orders, prevOrders, customers, events, products, settings] = await Promise.all([
    ordersBetween(startIso, endIso),
    ordersBetween(prevStart, prevEnd),
    repos.customers.find({}),
    repos.events.find({ createdAt: { $gte: startIso, $lte: endIso } }),
    repos.products.find({}),
    getSettings(),
  ]);

  const counted = orders.filter(isCounted);
  const prevCounted = prevOrders.filter(isCounted);
  const revenue = sum(counted, (o) => o.pricing.total);
  const prevRevenue = sum(prevCounted, (o) => o.pricing.total);
  const aov = counted.length ? Math.round(revenue / counted.length) : 0;
  const prevAov = prevCounted.length ? Math.round(prevRevenue / prevCounted.length) : 0;
  const profit = sum(counted.filter((o) => o.status !== 'returned'), profitOf);
  const prevProfit = sum(prevCounted.filter((o) => o.status !== 'returned'), profitOf);
  const sessions = sum(events.filter((e) => e.name === 'page_view'), (e) => e.count ?? 1);
  const conversion = sessions ? Math.round((counted.length / sessions) * 10000) / 100 : 0;
  // "new customer" = phone whose FIRST ever order falls in the period (works for guests too)
  const allOrders = await repos.orders.find({}, { sort: { createdAt: 1 } });
  const firstOrderAt = new Map<string, string>();
  for (const o of allOrders) if (!firstOrderAt.has(o.customer.phone)) firstOrderAt.set(o.customer.phone, o.createdAt);
  const firstIn = (a: string, b: string) => [...firstOrderAt.values()].filter((d) => d >= a && d <= b).length;
  const newCustomers = firstIn(startIso, endIso);
  const prevNewCustomers = firstIn(prevStart, prevEnd);
  const prevSessions = sum((await repos.events.find({ name: 'page_view', createdAt: { $gte: prevStart, $lte: prevEnd } })), (e) => e.count ?? 1);
  const prevConversion = prevSessions ? Math.round((prevCounted.length / prevSessions) * 10000) / 100 : 0;
  const rate = (os: Order[], s: string) => (os.length ? Math.round((os.filter((o) => o.status === s).length / os.length) * 1000) / 10 : 0);
  const phonesInRange = new Set(counted.map((o) => o.customer.phone));
  const returning = [...phonesInRange].filter((p) => customers.find((c) => c.phone === p && c.orderCount > 1)).length;

  // daily series (zero-filled)
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) days.push(dayKey(d.toISOString()));
  const series = days.map((day) => {
    const os = counted.filter((o) => dayKey(o.createdAt) === day);
    return { date: day, revenue: sum(os, (o) => o.pricing.total), orders: os.length, profit: sum(os.filter((o) => o.status !== 'returned'), profitOf) };
  });

  const itemsFlat = counted.flatMap((o) => o.items);
  const topProducts = groupSum(itemsFlat, (i) => i.slug, (i) => i.lineTotal)
    .slice(0, 8)
    .map(({ name: slug, value }) => {
      const p = products.find((x) => x.slug === slug);
      return { slug, name: p?.name.en ?? slug, image: p?.images[0]?.url, revenue: value, qty: sum(itemsFlat.filter((i) => i.slug === slug), (i) => i.qty) };
    });

  const lowStock = products
    .flatMap((p) => p.variants.filter((v) => v.stock <= settings.lowStockThreshold && !p.preOrder).map((v) => ({ slug: p.slug, name: p.name.en, sku: v.sku, size: v.size, color: v.color, stock: v.stock })))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  const funnelCount = (n: string) => sum(events.filter((e) => e.name === n), (e) => e.count ?? 1);
  const funnel = [
    { step: 'Sessions', value: sessions },
    { step: 'Product views', value: funnelCount('view_content') },
    { step: 'Add to cart', value: funnelCount('add_to_cart') },
    { step: 'Checkout', value: funnelCount('initiate_checkout') },
    { step: 'Orders', value: counted.length },
  ];

  const allPending = await repos.orders.find({ status: 'pending' });
  const pendingPayments = await repos.orders.count({ 'payment.status': 'pending_verification' });
  const newReviews = await repos.reviews.count({ status: 'pending' });

  return {
    range: { from: dayKey(startIso), to: dayKey(endIso) },
    kpis: {
      revenue: { value: revenue, change: pct(revenue, prevRevenue) },
      orders: { value: counted.length, change: pct(counted.length, prevCounted.length) },
      aov: { value: aov, change: pct(aov, prevAov) },
      profit: { value: profit, change: pct(profit, prevProfit) },
      conversion: { value: conversion, change: prevConversion ? pct(conversion, prevConversion) : null },
      newCustomers: { value: newCustomers, change: prevNewCustomers ? pct(newCustomers, prevNewCustomers) : null },
      returnRate: { value: rate(orders, 'returned'), change: rate(prevOrders, 'returned') ? pct(rate(orders, 'returned'), rate(prevOrders, 'returned')) : null },
      returningRate: { value: phonesInRange.size ? Math.round((returning / phonesInRange.size) * 100) : 0, change: 0 },
      cancelRate: { value: rate(orders, 'cancelled'), change: rate(prevOrders, 'cancelled') ? pct(rate(orders, 'cancelled'), rate(prevOrders, 'cancelled')) : null },
      itemsSold: { value: sum(itemsFlat, (i) => i.qty), change: 0 },
    },
    series,
    statusBreakdown: groupSum(orders, (o) => o.status, () => 1),
    paymentBreakdown: groupSum(counted, (o) => o.payment.method, (o) => o.pricing.total),
    categoryBreakdown: groupSum(itemsFlat, (i) => i.category, (i) => i.lineTotal),
    channelBreakdown: groupSum(counted, (o) => o.source.channel, (o) => o.pricing.total),
    districtBreakdown: groupSum(counted, (o) => o.shippingAddress.district, (o) => o.pricing.total).slice(0, 8),
    funnel,
    topProducts,
    lowStock,
    tasks: { pendingOrders: allPending.length, pendingPayments, newReviews, highRisk: allPending.filter((o) => o.flags.fraudRisk === 'high').length },
    recentOrders: orders
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
      .map((o) => ({ _id: o._id, orderNo: o.orderNo, customer: o.customer.name, total: o.pricing.total, status: o.status, payment: o.payment.method, createdAt: o.createdAt })),
  };
};

/* ───────────────────────── reports ───────────────────────── */

export type ReportType = 'sales' | 'products' | 'categories' | 'payments' | 'districts' | 'channels' | 'couriers' | 'coupons' | 'customers' | 'profit';

const bucketKey = (iso: string, groupBy: 'day' | 'week' | 'month') => {
  if (groupBy === 'month') return iso.slice(0, 7);
  if (groupBy === 'week') {
    const d = new Date(iso);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return `W ${d.toISOString().slice(0, 10)}`;
  }
  return iso.slice(0, 10);
};

/** Returns { columns, rows, chart } for each report — the same shape powers tables, charts and Excel export. */
export const report = async (type: ReportType, from?: string, to?: string, groupBy: 'day' | 'week' | 'month' = 'day') => {
  const { startIso, endIso } = dateRange(from, to, 30);
  const orders = await ordersBetween(startIso, endIso);
  const counted = orders.filter(isCounted);
  const items = counted.flatMap((o) => o.items.map((i) => ({ ...i, order: o })));

  switch (type) {
    case 'sales': {
      const m = new Map<string, Order[]>();
      for (const o of counted) m.set(bucketKey(o.createdAt, groupBy), [...(m.get(bucketKey(o.createdAt, groupBy)) ?? []), o]);
      const rows = [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, os]) => ({
        period, orders: os.length, items: sum(os, (o) => sum(o.items, (i) => i.qty)), gross: sum(os, (o) => o.pricing.subtotal),
        discount: sum(os, (o) => o.pricing.discount), delivery: sum(os, (o) => o.pricing.deliveryCharge), revenue: sum(os, (o) => o.pricing.total),
        aov: Math.round(sum(os, (o) => o.pricing.total) / os.length),
      }));
      return { columns: ['period', 'orders', 'items', 'gross', 'discount', 'delivery', 'revenue', 'aov'], rows, chart: { x: 'period', bars: ['revenue'], line: 'orders' } };
    }
    case 'products': {
      const products = await repos.products.find({});
      const rows = products.map((p) => {
        const mine = items.filter((i) => i.slug === p.slug);
        const qty = sum(mine, (i) => i.qty);
        return {
          product: p.name.en, sku: p.sku, category: p.category, views: p.viewCount, sold: qty, revenue: sum(mine, (i) => i.lineTotal),
          profit: sum(mine, (i) => (i.price - i.costPrice) * i.qty), stock: sum(p.variants, (v) => v.stock),
          conversion: p.viewCount ? `${((qty / p.viewCount) * 100).toFixed(1)}%` : '0%',
        };
      }).sort((a, b) => b.revenue - a.revenue);
      return { columns: ['product', 'sku', 'category', 'views', 'sold', 'revenue', 'profit', 'stock', 'conversion'], rows, chart: { x: 'product', bars: ['revenue'], limit: 10 } };
    }
    case 'categories': {
      const rows = groupSum(items, (i) => i.category, (i) => i.lineTotal).map((r) => ({ category: r.name, revenue: r.value, qty: sum(items.filter((i) => i.category === r.name), (i) => i.qty) }));
      return { columns: ['category', 'qty', 'revenue'], rows, chart: { pie: 'revenue', label: 'category' } };
    }
    case 'payments': {
      const rows = groupSum(counted, (o) => o.payment.method, (o) => o.pricing.total).map((r) => {
        const os = counted.filter((o) => o.payment.method === r.name);
        return { method: r.name, orders: os.length, revenue: r.value, paid: os.filter((o) => o.payment.status === 'paid').length, pending: os.filter((o) => o.payment.status !== 'paid').length };
      });
      return { columns: ['method', 'orders', 'revenue', 'paid', 'pending'], rows, chart: { pie: 'revenue', label: 'method' } };
    }
    case 'districts': {
      const rows = groupSum(counted, (o) => o.shippingAddress.district, (o) => o.pricing.total).map((r) => ({
        district: r.name, orders: counted.filter((o) => o.shippingAddress.district === r.name).length, revenue: r.value,
      }));
      return { columns: ['district', 'orders', 'revenue'], rows, chart: { x: 'district', bars: ['revenue'], limit: 12 } };
    }
    case 'channels': {
      const rows = groupSum(counted, (o) => o.source.channel, (o) => o.pricing.total).map((r) => {
        const os = counted.filter((o) => o.source.channel === r.name);
        return { channel: r.name, orders: os.length, revenue: r.value, aov: Math.round(r.value / os.length), campaigns: [...new Set(os.map((o) => o.source.utm_campaign).filter(Boolean))].join(', ') };
      });
      return { columns: ['channel', 'orders', 'revenue', 'aov', 'campaigns'], rows, chart: { pie: 'revenue', label: 'channel' } };
    }
    case 'couriers': {
      const shipped = orders.filter((o) => o.shipping.courier);
      const rows = (['steadfast', 'pathao', 'redx'] as const).map((c) => {
        const os = shipped.filter((o) => o.shipping.courier === c);
        const delivered = os.filter((o) => o.status === 'delivered');
        const returned = os.filter((o) => o.status === 'returned').length;
        const avgDays = delivered.length
          ? (sum(delivered, (o) => (new Date(o.deliveredAt ?? o.updatedAt).getTime() - new Date(o.shipping.bookedAt ?? o.createdAt).getTime()) / 86400000) / delivered.length).toFixed(1)
          : '-';
        return {
          courier: c, booked: os.length, delivered: delivered.length, returned, inTransit: os.filter((o) => o.status === 'shipped').length,
          successRate: os.length ? `${Math.round((delivered.length / Math.max(1, delivered.length + returned)) * 100)}%` : '-', avgDeliveryDays: avgDays,
          codCollected: sum(delivered.filter((o) => o.payment.method === 'cod'), (o) => o.pricing.total),
        };
      });
      return { columns: ['courier', 'booked', 'delivered', 'returned', 'inTransit', 'successRate', 'avgDeliveryDays', 'codCollected'], rows, chart: { x: 'courier', bars: ['delivered', 'returned'] } };
    }
    case 'coupons': {
      const used = counted.filter((o) => o.pricing.couponCode);
      const rows = groupSum(used, (o) => o.pricing.couponCode!, (o) => o.pricing.total).map((r) => {
        const os = used.filter((o) => o.pricing.couponCode === r.name);
        return { coupon: r.name, orders: os.length, revenue: r.value, discountGiven: sum(os, (o) => o.pricing.discount) };
      });
      return { columns: ['coupon', 'orders', 'revenue', 'discountGiven'], rows, chart: { x: 'coupon', bars: ['revenue', 'discountGiven'] } };
    }
    case 'customers': {
      const byPhone = new Map<string, Order[]>();
      for (const o of counted) byPhone.set(o.customer.phone, [...(byPhone.get(o.customer.phone) ?? []), o]);
      const rows = [...byPhone.values()].map((os) => ({
        customer: os[0].customer.name, phone: os[0].customer.phone, orders: os.length, spent: sum(os, (o) => o.pricing.total),
        firstOrder: dayKey(os[0].createdAt), lastOrder: dayKey(os[os.length - 1].createdAt), type: os.length > 1 ? 'repeat' : 'one-time',
      })).sort((a, b) => b.spent - a.spent);
      const repeat = rows.filter((r) => r.type === 'repeat').length;
      return {
        columns: ['customer', 'phone', 'orders', 'spent', 'firstOrder', 'lastOrder', 'type'], rows,
        chart: { pieData: [{ name: 'repeat', value: repeat }, { name: 'one-time', value: rows.length - repeat }] },
      };
    }
    case 'profit': {
      const m = new Map<string, Order[]>();
      for (const o of counted.filter((x) => x.status !== 'returned')) m.set(bucketKey(o.createdAt, groupBy), [...(m.get(bucketKey(o.createdAt, groupBy)) ?? []), o]);
      const rows = [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, os]) => {
        const revenue = sum(os, (o) => o.pricing.subtotal);
        const cost = sum(os, (o) => sum(o.items, (i) => i.costPrice * i.qty));
        const discount = sum(os, (o) => o.pricing.discount);
        return { period, revenue, cost, discount, grossProfit: revenue - cost - discount, margin: revenue ? `${Math.round(((revenue - cost - discount) / revenue) * 100)}%` : '0%' };
      });
      return { columns: ['period', 'revenue', 'cost', 'discount', 'grossProfit', 'margin'], rows, chart: { x: 'period', bars: ['revenue', 'grossProfit'] } };
    }
  }
};

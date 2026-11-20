import { config } from '../config/env.js';
import { MemoryRepository } from '../db/memory.repository.js';
import { MongoRepository } from '../db/mongo.repository.js';
import type { Repository } from '../db/repository.js';
import { buildSeed, type SeedData } from '../data/seed.js';
import type {
  AbandonedCart, AuditLog, Category, Cms, ContactMessage, Coupon, Customer, FlashSale, InventoryLog, Order, OtpRecord,
  Product, Review, Settings, SmsLog, Staff, StockAlert, Subscriber, TrackingEvent,
} from '../types/domain.js';

/**
 * Repository registry — the ONLY place that knows which storage backs each collection.
 * Services import `repos` and never touch Mongoose or the JSON store directly.
 */
const make = <T extends { _id: string }>(name: string, seedKey?: keyof SeedData): Repository<T> =>
  config.dataSource === 'mongo'
    ? new MongoRepository<T>(name)
    : new MemoryRepository<T>(name, () => (seedKey ? (buildSeed()[seedKey] as unknown as T[]) : []));

export const repos = {
  products: make<Product>('products', 'products'),
  categories: make<Category>('categories', 'categories'),
  customers: make<Customer>('customers', 'customers'),
  orders: make<Order>('orders', 'orders'),
  reviews: make<Review>('reviews', 'reviews'),
  coupons: make<Coupon>('coupons', 'coupons'),
  flashSales: make<FlashSale>('flashSales', 'flashSales'),
  settings: make<Settings>('settings', 'settings'),
  cms: make<Cms>('cms', 'cms'),
  staff: make<Staff>('staff', 'staff'),
  abandonedCarts: make<AbandonedCart>('abandonedCarts', 'abandonedCarts'),
  events: make<TrackingEvent>('events', 'events'),
  subscribers: make<Subscriber>('subscribers', 'subscribers'),
  contacts: make<ContactMessage>('contacts', 'contacts'),
  stockAlerts: make<StockAlert>('stockAlerts', 'stockAlerts'),
  smsLogs: make<SmsLog>('smsLogs', 'smsLogs'),
  auditLogs: make<AuditLog>('auditLogs', 'auditLogs'),
  inventoryLogs: make<InventoryLog>('inventoryLogs', 'inventoryLogs'),
  otp: make<OtpRecord>('otp'),
};

export type Repos = typeof repos;
export type CollectionName = keyof Repos;

import mongoose, { Schema, type Model } from 'mongoose';
import type { Filter, FindOptions, Repository } from './repository.js';

/**
 * MongoDB repository. Documents keep string `_id`s (e.g. "prd_ab12cd") so data
 * moves between the demo store and Atlas without rewriting references.
 * Schemas are `strict: false` — validation lives in Zod validators + services.
 */
const models = new Map<string, Model<Record<string, unknown>>>();

const INDEXES: Record<string, Record<string, 1 | -1 | 'text'>[]> = {
  products: [{ slug: 1 }, { category: 1, status: 1 }, { price: 1 }, { 'variants.sku': 1 }],
  orders: [{ orderNo: 1 }, { 'customer.phone': 1 }, { createdAt: -1 }, { status: 1 }, { idempotencyKey: 1 }],
  customers: [{ phone: 1 }, { email: 1 }],
  staff: [{ email: 1 }],
  reviews: [{ productId: 1, status: 1 }],
  otp: [{ phone: 1, purpose: 1 }],
  events: [{ name: 1, createdAt: -1 }],
};

const getModel = (name: string) => {
  if (!models.has(name)) {
    const schema = new Schema({ _id: { type: String, required: true } }, { strict: false, strictQuery: false, versionKey: false, collection: name });
    for (const idx of INDEXES[name] ?? []) schema.index(idx);
    models.set(name, mongoose.model<Record<string, unknown>>(name, schema));
  }
  return models.get(name)!;
};

export class MongoRepository<T extends { _id: string }> implements Repository<T> {
  private readonly model: Model<Record<string, unknown>>;
  constructor(public readonly name: string) {
    this.model = getModel(name);
  }

  async find(filter: Filter = {}, opts: FindOptions = {}) {
    let q = this.model.find(filter);
    if (opts.sort) q = q.sort(opts.sort);
    if (opts.skip) q = q.skip(opts.skip);
    if (opts.limit) q = q.limit(opts.limit);
    return (await q.lean()) as unknown as T[];
  }
  async findOne(filter: Filter) {
    return (await this.model.findOne(filter).lean()) as unknown as T | null;
  }
  async findById(id: string) {
    return (await this.model.findById(id).lean()) as unknown as T | null;
  }
  async count(filter: Filter = {}) {
    return this.model.countDocuments(filter);
  }
  async insert(doc: T) {
    await this.model.create(doc as unknown as Record<string, unknown>);
    return doc;
  }
  async insertMany(docs: T[]) {
    if (docs.length) await this.model.insertMany(docs as unknown as Record<string, unknown>[]);
  }
  async update(id: string, patch: Partial<T>) {
    return (await this.model
      .findByIdAndUpdate(id, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })
      .lean()) as unknown as T | null;
  }
  async updateWhere(filter: Filter, patch: Partial<T> | ((doc: T) => Partial<T>)) {
    if (typeof patch === 'function') {
      // Optimistic: read, compute, then update only if the doc still matches the filter.
      const current = await this.findOne(filter);
      if (!current) return null;
      const next = patch(current);
      return (await this.model
        .findOneAndUpdate({ ...filter, _id: current._id }, { $set: { ...next, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })
        .lean()) as unknown as T | null;
    }
    return (await this.model
      .findOneAndUpdate(filter, { $set: { ...patch, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' })
      .lean()) as unknown as T | null;
  }
  async delete(id: string) {
    const r = await this.model.deleteOne({ _id: id });
    return r.deletedCount > 0;
  }
  async deleteMany(filter: Filter) {
    const r = await this.model.deleteMany(filter);
    return r.deletedCount;
  }
  async replaceAll(docs: T[]) {
    await this.model.deleteMany({});
    await this.insertMany(docs);
  }
}

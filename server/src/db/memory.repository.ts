import fs from 'node:fs';
import path from 'node:path';
import { Query } from 'mingo';
import type { Filter, FindOptions, Repository } from './repository.js';

const DATA_DIR = path.resolve(process.cwd(), '.data');

/**
 * In-memory repository backed by a JSON file in ./.data (so demo orders survive restarts).
 * Node is single-threaded, so each method body runs atomically — conditional updates
 * (e.g. stock decrement) cannot race each other.
 */
export class MemoryRepository<T extends { _id: string }> implements Repository<T> {
  private docs: T[] = [];
  private writeTimer: NodeJS.Timeout | null = null;
  private readonly file: string;

  constructor(public readonly name: string, seed: () => T[]) {
    this.file = path.join(DATA_DIR, `${name}.json`);
    if (fs.existsSync(this.file)) {
      try {
        this.docs = JSON.parse(fs.readFileSync(this.file, 'utf8')) as T[];
        return;
      } catch {
        /* corrupted file → reseed */
      }
    }
    this.docs = seed();
    this.persist(true);
  }

  private persist(sync = false) {
    const write = () => {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.docs));
      fs.renameSync(tmp, this.file);
    };
    if (sync) return write();
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(write, 300);
  }

  private clone<X>(v: X): X {
    return structuredClone(v);
  }

  private query(filter: Filter = {}) {
    return new Query(filter as Record<string, unknown>);
  }

  async find(filter: Filter = {}, opts: FindOptions = {}) {
    let cursor = this.query(filter).find<T>(this.docs as unknown as Record<string, unknown>[]);
    if (opts.sort) cursor = cursor.sort(opts.sort);
    if (opts.skip) cursor = cursor.skip(opts.skip);
    if (opts.limit) cursor = cursor.limit(opts.limit);
    return this.clone(cursor.all() as T[]);
  }

  async findOne(filter: Filter) {
    const q = this.query(filter);
    const hit = this.docs.find((d) => q.test(d as unknown as Record<string, unknown>));
    return hit ? this.clone(hit) : null;
  }

  async findById(id: string) {
    const hit = this.docs.find((d) => d._id === id);
    return hit ? this.clone(hit) : null;
  }

  async count(filter: Filter = {}) {
    if (!Object.keys(filter).length) return this.docs.length;
    const q = this.query(filter);
    return this.docs.filter((d) => q.test(d as unknown as Record<string, unknown>)).length;
  }

  async insert(doc: T) {
    this.docs.push(this.clone(doc));
    this.persist();
    return this.clone(doc);
  }

  async insertMany(docs: T[]) {
    this.docs.push(...this.clone(docs));
    this.persist();
  }

  async update(id: string, patch: Partial<T>) {
    const i = this.docs.findIndex((d) => d._id === id);
    if (i < 0) return null;
    this.docs[i] = { ...this.docs[i], ...this.clone(patch), updatedAt: new Date().toISOString() };
    this.persist();
    return this.clone(this.docs[i]);
  }

  async updateWhere(filter: Filter, patch: Partial<T> | ((doc: T) => Partial<T>)) {
    const q = this.query(filter);
    const i = this.docs.findIndex((d) => q.test(d as unknown as Record<string, unknown>));
    if (i < 0) return null;
    const p = typeof patch === 'function' ? patch(this.clone(this.docs[i])) : patch;
    this.docs[i] = { ...this.docs[i], ...this.clone(p), updatedAt: new Date().toISOString() };
    this.persist();
    return this.clone(this.docs[i]);
  }

  async delete(id: string) {
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => d._id !== id);
    this.persist();
    return this.docs.length < before;
  }

  async deleteMany(filter: Filter) {
    const q = this.query(filter);
    const before = this.docs.length;
    this.docs = this.docs.filter((d) => !q.test(d as unknown as Record<string, unknown>));
    this.persist();
    return before - this.docs.length;
  }

  async replaceAll(docs: T[]) {
    this.docs = this.clone(docs);
    this.persist(true);
  }
}

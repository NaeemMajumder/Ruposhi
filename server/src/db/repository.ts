/**
 * Storage-agnostic repository contract.
 * Filters use MongoDB query syntax so the SAME service code runs on the
 * in-memory demo store (via mingo) and on real MongoDB (via Mongoose).
 */
export type Filter = Record<string, unknown>;
export type Sort = Record<string, 1 | -1>;

export interface FindOptions {
  sort?: Sort;
  skip?: number;
  limit?: number;
}

export interface Repository<T extends { _id: string }> {
  readonly name: string;
  find(filter?: Filter, opts?: FindOptions): Promise<T[]>;
  findOne(filter: Filter): Promise<T | null>;
  findById(id: string): Promise<T | null>;
  count(filter?: Filter): Promise<number>;
  insert(doc: T): Promise<T>;
  insertMany(docs: T[]): Promise<void>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  /** Atomic conditional update: applies `patch` only when doc matches `filter`. Returns updated doc or null. */
  updateWhere(filter: Filter, patch: Partial<T> | ((doc: T) => Partial<T>)): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  deleteMany(filter: Filter): Promise<number>;
  replaceAll(docs: T[]): Promise<void>;
}

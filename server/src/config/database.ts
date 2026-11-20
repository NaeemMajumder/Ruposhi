import mongoose from 'mongoose';
import { config } from './env.js';

/** Connects to MongoDB only when DATA_SOURCE=mongo. Demo mode needs no database. */
export const connectDatabase = async () => {
  if (config.dataSource !== 'mongo') {
    console.log('🗂️  Data source: in-memory demo store (./.data). Set DATA_SOURCE=mongo to use MongoDB.');
    return;
  }
  if (!config.mongoUri || config.mongoUri.includes('<user>')) {
    throw new Error('DATA_SOURCE=mongo but MONGODB_URI is not set. Add your Atlas connection string to .env');
  }
  // MUST be false: our schemas only declare _id (documents are validated by Zod), so strictQuery=true would
  // silently DROP every filter field (category, email, orderNo…) and turn each query into find({}).
  // NoSQL-injection safety comes from the request sanitizer that strips $-keys from user input.
  mongoose.set('strictQuery', false);
  // dbName overrides any database name in the URI, so Ruposhi only ever reads/writes its own database
  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb, serverSelectionTimeoutMS: 15_000, maxPoolSize: process.env.VERCEL ? 5 : 10 });
  console.log(`🍃 Connected to MongoDB · database "${config.mongoDb}"`);
};

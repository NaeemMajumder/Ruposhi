/**
 * Re-fills MongoDB with the demo data (the database named by MONGODB_DB, default "ruposhi").
 * Usage: DATA_SOURCE=mongo + MONGODB_URI in .env, then `npm run seed:mongo`.
 * If the database already has data you must add --force (it REPLACES every Ruposhi collection).
 */
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { writeSeed } from '../data/bootstrap.js';
import { ensureDemoAccounts } from '../services/auth.service.js';
import { repos } from '../repositories/index.js';

const run = async () => {
  if (config.dataSource !== 'mongo') {
    console.error('Set DATA_SOURCE=mongo in .env first.');
    process.exit(1);
  }
  await connectDatabase();
  const existing = (await repos.products.count()) + (await repos.orders.count());
  if (existing > 0 && !process.argv.includes('--force')) {
    console.error(`Database "${config.mongoDb}" already has data. Run "npm run seed:mongo -- --force" to replace it with the demo store.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  await writeSeed();
  await ensureDemoAccounts();
  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

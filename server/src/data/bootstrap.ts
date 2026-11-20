import { config } from '../config/env.js';
import { repos } from '../repositories/index.js';
import { buildSeed } from './seed.js';
import { DEMO_VIDEO_URL } from './products.demo.js';

/** Writes the full demo store into the database, collection by collection. */
export const writeSeed = async (log = true) => {
  const seed = buildSeed();
  for (const [name, docs] of Object.entries(seed)) {
    const repo = repos[name as keyof typeof repos];
    if (!repo) continue;
    await repo.replaceAll(docs as never[]);
    if (log) console.log(`  ✔ ${name}: ${(docs as unknown[]).length}`);
  }
};

/**
 * First start on an EMPTY MongoDB database → fill it with the demo store so the site works immediately.
 * Never touches a database that already has Ruposhi settings or products.
 */
export const seedMongoIfEmpty = async () => {
  if (config.dataSource !== 'mongo') return;
  const [settings, products] = await Promise.all([repos.settings.count(), repos.products.count()]);
  if (settings > 0 || products > 0) {
    // data from another app/version in the same database → explain instead of crashing on every request
    const sample = (await repos.products.find({}, { limit: 1 }))[0] as unknown as { _id?: unknown; variants?: unknown } | undefined;
    if (sample && (typeof sample._id !== 'string' || !Array.isArray(sample.variants))) {
      console.warn(
        `\n⚠️  Database "${config.mongoDb}" already holds data from a different project (it is not Ruposhi's format).\n` +
          `   Use a fresh database: set MONGODB_DB=ruposhi_store in .env and restart (old data stays untouched),\n` +
          `   or replace it with the demo store: npm run seed:mongo -- --force  (deletes those collections).\n`,
      );
    }
    return;
  }
  console.log(`🌱 Database "${config.mongoDb}" is empty — adding the demo store…`);
  await writeSeed();
};

/**
 * DEMO_MODE: give the 20 demo products the demo YouTube video if they were created before videos existed.
 * Only touches products that have NO videoUrl field at all — clearing the link in the admin ('' ) is respected.
 */
export const applyDemoVideos = async () => {
  if (!config.demoMode) return;
  const missing = await repos.products.find({ _id: { $regex: '^prd_\\d{3}$' }, videoUrl: { $exists: false } });
  for (const p of missing) await repos.products.update(p._id, { videoUrl: DEMO_VIDEO_URL });
  if (missing.length) console.log(`🎬 Added the demo YouTube video to ${missing.length} demo product(s)`);
};

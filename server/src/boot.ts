import { connectDatabase } from './config/database.js';
import { applyDemoVideos, seedMongoIfEmpty } from './data/bootstrap.js';
import { ensureDemoAccounts } from './services/auth.service.js';

let booting: Promise<void> | null = null;

/**
 * One-time start-up work: connect MongoDB, fill an empty database with the demo store,
 * patch demo videos and make sure the demo logins exist.
 *
 * Runs ONCE per process — before `listen()` locally, and on the first request of each
 * Vercel instance (later requests on the same instance reuse the open connection).
 * If it fails, the next request tries again instead of the instance staying broken.
 */
export const ready = () =>
  (booting ??= (async () => {
    await connectDatabase();
    await seedMongoIfEmpty();
    await applyDemoVideos();
    await ensureDemoAccounts();
  })().catch((e: unknown) => {
    booting = null;
    throw e;
  }));

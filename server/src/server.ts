import { config } from './config/env.js';
import app from './app.js';
import { ready } from './boot.js';

/**
 * Local / VPS entry: `npm run dev` · `npm start`.
 * On Vercel this file only re-exports the app — Vercel runs it as a function and never calls listen().
 */
const start = async () => {
  await ready();
  const server = app.listen(config.port, () => {
    console.log(`\n🌸 Ruposhi API running → http://localhost:${config.port}/api/v1`);
    console.log(`   Mode: ${config.demoMode ? 'DEMO (OTP/payments/courier/SMS simulated)' : 'LIVE'} · Data: ${config.dataSource}\n`);
  });
  const shutdown = (sig: string) => {
    console.log(`\n${sig} received — shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

if (!process.env.VERCEL) {
  start().catch((e) => {
    console.error('Failed to start:', e);
    process.exit(1);
  });
}

export default app;

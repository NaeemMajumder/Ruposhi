import fs from 'node:fs';
import path from 'node:path';

/** Deletes ./.data so the next server start re-creates the original demo data. */
const dir = path.resolve(process.cwd(), '.data');
fs.rmSync(dir, { recursive: true, force: true });
console.log('✔ Demo data reset. Start the server again to re-seed: npm run dev');

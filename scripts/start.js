import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  const result = spawnSync(process.execPath, [path.join(root, script)], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('Database bootstrap failed at ' + script + ' (exit ' + result.status + ').');
  }
}

if (process.env.DATABASE_URL) {
  console.log('Quiet English: checking database migrations…');
  run('migrate.js');
  console.log('Quiet English: adding any missing curated exercises…');
  run('seed.js');
} else {
  console.warn('DATABASE_URL is not configured. Personal learning APIs remain unavailable.');
}

await import('../server.js');

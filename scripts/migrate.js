import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. No database was changed.');
  process.exit(1);
}

const root = path.dirname(fileURLToPath(import.meta.url));
const sql = await fs.readFile(path.join(root, '../db/migrations/001_initial.sql'), 'utf8');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
});

try {
  await pool.query(sql);
  console.log('Quiet English database schema is up to date.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

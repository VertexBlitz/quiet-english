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
const migrationsDir = path.join(root, '../db/migrations');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined
});

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const files = (await fs.readdir(migrationsDir))
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const existing = await pool.query('SELECT 1 FROM schema_migrations WHERE filename=$1', [filename]);
    if (existing.rowCount) {
      console.log('Already applied:', filename);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log('Applied:', filename);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${filename} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  console.log('Quiet English database schema is up to date.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

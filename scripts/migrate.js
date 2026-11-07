import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import {
  getDatabaseSchema,
  getPostgresSchemaOptions,
  ensureDatabaseSchema
} from '../src/db-schema.js';

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. No database was changed.');
  process.exit(1);
}

const root = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(root, '../db/migrations');
const ssl = process.env.PGSSLMODE === 'disable'
  ? false
  : process.env.PGSSLMODE === 'require'
    ? { rejectUnauthorized: true }
    : undefined;

let pool;

try {
  const schema = getDatabaseSchema();

  if (schema) {
    // Bootstrap through the database's default schema. The scoped pool is only
    // created after the Preview schema exists.
    const bootstrapPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: 1,
      connectionTimeoutMillis: 5_000
    });
    try {
      await ensureDatabaseSchema(bootstrapPool, schema);
      console.log('Prepared isolated database schema:', schema);
    } finally {
      await bootstrapPool.end();
    }
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl,
    options: getPostgresSchemaOptions(schema),
    max: 4,
    connectionTimeoutMillis: 5_000
  });

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
  if (pool) await pool.end();
}

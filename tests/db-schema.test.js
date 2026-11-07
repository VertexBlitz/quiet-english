import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDatabaseSchema,
  getPostgresSchemaOptions,
  ensureDatabaseSchema
} from '../src/db-schema.js';

test('DB_SCHEMA is optional and defaults to the existing public schema', () => {
  assert.equal(getDatabaseSchema({}), null);
  assert.equal(getPostgresSchemaOptions(null), undefined);
});

test('DB_SCHEMA validates PostgreSQL identifiers', () => {
  assert.equal(getDatabaseSchema({ DB_SCHEMA: 'quiet_english_preview' }), 'quiet_english_preview');
  assert.equal(
    getPostgresSchemaOptions('quiet_english_preview'),
    '-c search_path=quiet_english_preview'
  );
  assert.throws(() => getDatabaseSchema({ DB_SCHEMA: 'preview; DROP SCHEMA public' }));
  assert.throws(() => getPostgresSchemaOptions('Public'));
});

test('schema bootstrap creates only the validated schema', async () => {
  let statement;
  const fakePool = {
    async query(sql) { statement = sql; }
  };
  await ensureDatabaseSchema(fakePool, 'quiet_english_preview');
  assert.equal(statement, 'CREATE SCHEMA IF NOT EXISTS "quiet_english_preview"');
  await ensureDatabaseSchema(fakePool, null);
  assert.throws(() => ensureDatabaseSchema(fakePool, 'preview"; DROP SCHEMA public;--'));
});

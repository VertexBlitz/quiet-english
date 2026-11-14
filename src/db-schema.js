const SCHEMA_PATTERN = /^[a-z_][a-z0-9_]{0,62}$/;

export function getDatabaseSchema(env = process.env) {
  const value = typeof env.DB_SCHEMA === 'string' ? env.DB_SCHEMA.trim() : '';
  if (!value) return null;
  if (!SCHEMA_PATTERN.test(value)) {
    throw new Error('DB_SCHEMA must be a valid lowercase PostgreSQL identifier.');
  }
  return value;
}

export function getPostgresSchemaOptions(schema) {
  if (!schema) return undefined;
  if (!SCHEMA_PATTERN.test(schema)) {
    throw new Error('Invalid PostgreSQL schema identifier.');
  }
  // Deliberately omit "public" from search_path so Preview cannot fall back to
  // Production tables if a Preview migration or relation is missing.
  return '-c search_path=' + schema;
}

export async function ensureDatabaseSchema(pool, schema) {
  if (!schema) return;
  if (!SCHEMA_PATTERN.test(schema)) {
    throw new Error('Invalid PostgreSQL schema identifier.');
  }
  await pool.query('CREATE SCHEMA IF NOT EXISTS "' + schema + '"');
}

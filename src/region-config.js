const REGION_SCHEMAS = Object.freeze({
  preview: 'quiet_english_preview',
  eu: 'quiet_english_eu',
  ru: 'quiet_english_ru'
});

export function getAppRegion(env = process.env) {
  const value = typeof env.APP_REGION === 'string' && env.APP_REGION.trim()
    ? env.APP_REGION.trim().toLowerCase()
    : 'preview';
  return Object.hasOwn(REGION_SCHEMAS, value) ? value : 'unknown';
}

export function getRequiredRegistrationSchema(env = process.env) {
  const configured = typeof env.REGISTRATION_REQUIRED_DB_SCHEMA === 'string'
    ? env.REGISTRATION_REQUIRED_DB_SCHEMA.trim()
    : '';
  if (configured) return /^[a-z_][a-z0-9_]{0,62}$/.test(configured) ? configured : null;
  const region = getAppRegion(env);
  return REGION_SCHEMAS[region] || null;
}

export function isRegistrationDatabaseIsolated(env = process.env) {
  const expectedSchema = getRequiredRegistrationSchema(env);
  return Boolean(
    getAppRegion(env) !== 'unknown' &&
    expectedSchema &&
    env.REGISTRATION_DATABASE_ISOLATED === 'true' &&
    env.DB_SCHEMA === expectedSchema
  );
}

export function isExternalPersonalDataProcessingAllowed(env = process.env) {
  // Russian deployments must explicitly approve each external processor
  // before personal data can be sent to services outside the Russian region.
  return getAppRegion(env) !== 'ru' || env.REGION_EXTERNAL_PROCESSORS_APPROVED === 'true';
}

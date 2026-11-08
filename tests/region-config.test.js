import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAppRegion,
  getRequiredRegistrationSchema,
  isRegistrationDatabaseIsolated,
  isExternalPersonalDataProcessingAllowed
} from '../src/region-config.js';

test('deployment region defaults to Preview and rejects unknown values', () => {
  assert.equal(getAppRegion({}), 'preview');
  assert.equal(getAppRegion({ APP_REGION: 'eu' }), 'eu');
  assert.equal(getAppRegion({ APP_REGION: 'ru' }), 'ru');
  assert.equal(getAppRegion({ APP_REGION: 'unknown-region' }), 'unknown');
});

test('each region has a distinct expected database schema', () => {
  assert.equal(getRequiredRegistrationSchema({}), 'quiet_english_preview');
  assert.equal(getRequiredRegistrationSchema({ APP_REGION: 'eu' }), 'quiet_english_eu');
  assert.equal(getRequiredRegistrationSchema({ APP_REGION: 'ru' }), 'quiet_english_ru');
  assert.equal(getRequiredRegistrationSchema({
    APP_REGION: 'ru',
    REGISTRATION_REQUIRED_DB_SCHEMA: 'regional_private'
  }), 'regional_private');
  assert.equal(getRequiredRegistrationSchema({ REGISTRATION_REQUIRED_DB_SCHEMA: 'bad;schema' }), null);
});

test('registration requires an isolated database and the schema expected for that region', () => {
  assert.equal(isRegistrationDatabaseIsolated({
    APP_REGION: 'ru',
    DB_SCHEMA: 'quiet_english_ru',
    REGISTRATION_DATABASE_ISOLATED: 'true'
  }), true);
  assert.equal(isRegistrationDatabaseIsolated({
    APP_REGION: 'ru',
    DB_SCHEMA: 'quiet_english_preview',
    REGISTRATION_DATABASE_ISOLATED: 'true'
  }), false);
  assert.equal(isRegistrationDatabaseIsolated({
    APP_REGION: 'ru',
    DB_SCHEMA: 'quiet_english_ru',
    REGISTRATION_DATABASE_ISOLATED: 'false'
  }), false);
  assert.equal(isRegistrationDatabaseIsolated({
    APP_REGION: 'unlisted',
    DB_SCHEMA: 'quiet_english_ru',
    REGISTRATION_DATABASE_ISOLATED: 'true'
  }), false);
});

test('Russian region blocks external personal-data processors by default', () => {
  assert.equal(isExternalPersonalDataProcessingAllowed({ APP_REGION: 'ru' }), false);
  assert.equal(isExternalPersonalDataProcessingAllowed({
    APP_REGION: 'ru',
    REGION_EXTERNAL_PROCESSORS_APPROVED: 'true'
  }), true);
  assert.equal(isExternalPersonalDataProcessingAllowed({ APP_REGION: 'preview' }), true);
});

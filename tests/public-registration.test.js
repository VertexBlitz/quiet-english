import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registerHtml = await readFile(new URL('../public/register.html', import.meta.url), 'utf8');
const guardianHtml = await readFile(new URL('../public/guardian-consent.html', import.meta.url), 'utf8');
const guardianJs = await readFile(new URL('../public/guardian-consent.js', import.meta.url), 'utf8');
const authRoutes = await readFile(new URL('../src/routes/auth.js', import.meta.url), 'utf8');
const serverConfig = await readFile(new URL('../server.js', import.meta.url), 'utf8');
const regionConfig = await readFile(new URL('../src/region-config.js', import.meta.url), 'utf8');
const optionalCountryMigration = await readFile(new URL('../db/migrations/012_optional_country_code.sql', import.meta.url), 'utf8');

test('international pilot public registration is adult-only and does not ask for date of birth', () => {
  assert.match(registerHtml, /name="age_band" value="18_plus"/);
  assert.doesNotMatch(registerHtml, /value="13_15"|value="16_17"/);
  assert.match(registerHtml, /only to adults aged 18 or older/i);
  assert.doesNotMatch(registerHtml, /name="(date_of_birth|birth_date|dob)"/i);
});

test('pilot signup records only a self-declared Germany or Italy residence', () => {
  assert.match(registerHtml, /name="country_code"/);
  assert.match(registerHtml, /value="DE"/);
  assert.match(registerHtml, /value="IT"/);
  assert.match(registerHtml, /Country of residence/);
  assert.doesNotMatch(guardianHtml, /name="country_code"/);
  assert.match(authRoutes, /isPilotCountryCode\(country_code\)/);
  assert.match(authRoutes, /INSERT INTO users \(email, password_hash, age_band, country_code\)/);
  assert.match(authRoutes, /preferred_language, country_code/);
  assert.match(optionalCountryMigration, /ALTER TABLE users ALTER COLUMN country_code DROP NOT NULL/);
  assert.match(optionalCountryMigration, /ALTER TABLE registration_events ALTER COLUMN country_code DROP NOT NULL/);
  assert.doesNotMatch(optionalCountryMigration, /DROP COLUMN/i);
});

test('the adult-only pilot hides minor signup and requires an explicit backend gate', () => {
  assert.doesNotMatch(registerHtml, /data-minor-fields|guardian_email|age_confirmed|value="13_15"|value="16_17"/);
  const requestStart = authRoutes.indexOf("router.post('/guardian-consent-request'");
  const requestEnd = authRoutes.indexOf("router.post('/guardian-consent-info'", requestStart);
  const requestRoute = authRoutes.slice(requestStart, requestEnd);
  assert.ok(requestStart >= 0 && requestEnd > requestStart);
  assert.match(requestRoute, /isMinorRegistrationEnabled/);
  const completeStart = authRoutes.indexOf("router.post('/guardian-consent-complete'");
  const completeEnd = authRoutes.indexOf("router.post('/guardian-withdrawal-request'", completeStart);
  const completeRoute = authRoutes.slice(completeStart, completeEnd);
  assert.ok(completeStart >= 0 && completeEnd > completeStart);
  assert.match(completeRoute, /isMinorRegistrationEnabled/);
  assert.doesNotMatch(guardianHtml, /name="country_code"/);
  assert.doesNotMatch(guardianJs, /country_code/);
  assert.doesNotMatch(authRoutes, /country_code|normalizeCountryCode|isValidCountryCode/);
});

test('parent page separately captures authority, Terms, Privacy and data consent', () => {
  assert.match(guardianHtml, /name="guardian_confirmed"/);
  assert.match(guardianHtml, /name="terms_accepted"/);
  assert.match(guardianHtml, /name="privacy_accepted"/);
  assert.match(guardianHtml, /name="personal_data_accepted"/);
  assert.match(guardianHtml, /name="minimum_age_confirmed"/);
  assert.doesNotMatch(guardianHtml, /name="country_code"/);
  assert.doesNotMatch(registerHtml, /name="country_code"/);
  assert.doesNotMatch(registerHtml, /name="preferred_language"/);
  assert.doesNotMatch(guardianHtml, /name="preferred_language"/);
  assert.match(guardianHtml, /guardian-consent.js/);
});

test('guardian flow supports consent approval and withdrawal', () => {
  assert.match(guardianJs, /guardian-consent-complete/);
  assert.match(guardianJs, /guardian-consent-withdraw/);
  assert.match(guardianJs, /guardian-withdrawal-request/);
  assert.match(authRoutes, /router.post\('\/guardian-consent-request'/);
  assert.match(authRoutes, /router.post\('\/guardian-consent-complete'/);
  assert.match(authRoutes, /router.post\('\/guardian-consent-withdraw'/);
});

test('minor account creation requires country-specific enablement and guardian approval', () => {
  assert.match(authRoutes, /isMinorRegistrationEnabled/);
  assert.match(authRoutes, /if \(!isAdultRegistration\(age_band, adult_confirmed\)\)/);
  assert.match(authRoutes, /if \(requiresGuardianConsent\(item\.age_band\) && !item\.guardian_consented_at\)/);
  assert.match(authRoutes, /guardian_consented_at\)/);
});

test('public registration requires all operational and legal launch gates', () => {
  const start = serverConfig.indexOf('function getRegistrationReadiness()');
  const end = serverConfig.indexOf("app.get('/api/registration-status'", start);
  assert.ok(start >= 0 && end > start);
  const readiness = serverConfig.slice(start, end);
  for (const name of [
    'REGISTRATION_ENABLED',
    'REGISTRATION_LEGAL_APPROVED',
    'isRegistrationDatabaseIsolated',
    'REGISTRATION_REGION_SERVICES_APPROVED',
    'REGION_EXTERNAL_PROCESSORS_APPROVED',
    'REGISTRATION_DATA_LOCALIZATION_APPROVED',
    'REGISTRATION_OPERATOR_DETAILS_APPROVED',
    'TURNSTILE_SECRET_KEY',
    'RESEND_API_KEY'
  ]) {
    assert.match(readiness, new RegExp(name));
  }
  assert.match(regionConfig, /REGION_EXTERNAL_PROCESSORS_APPROVED/);
});

test('guardian approval token is not placed in page query strings', () => {
  assert.match(authRoutes, /function guardianConsentPageUrl\(token\)/);
  assert.match(authRoutes, /router.post\('\/guardian-consent-info'/);
  assert.match(guardianJs, /new URLSearchParams\(location.hash/);
  assert.match(guardianJs, /guardianRequest\('\/api\/auth\/guardian-consent-info', \{ token \}\)/);
  assert.doesNotMatch(guardianJs, /guardian-consent-info\?token=/);
});

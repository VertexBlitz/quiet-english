import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registerHtml = await readFile(new URL('../public/register.html', import.meta.url), 'utf8');
const guardianHtml = await readFile(new URL('../public/guardian-consent.html', import.meta.url), 'utf8');
const guardianJs = await readFile(new URL('../public/guardian-consent.js', import.meta.url), 'utf8');
const authRoutes = await readFile(new URL('../src/routes/auth.js', import.meta.url), 'utf8');

test('registration asks for an age band, not a date of birth', () => {
  assert.match(registerHtml, /name="age_band"/);
  assert.match(registerHtml, /value="13_15"/);
  assert.match(registerHtml, /value="16_17"/);
  assert.match(registerHtml, /value="18_plus"/);
  assert.doesNotMatch(registerHtml, /name="(date_of_birth|birth_date|dob)"/i);
});

test('the minor signup step only requests guardian contact and age attestation', () => {
  const start = registerHtml.indexOf('<div data-minor-fields hidden>');
  const end = registerHtml.indexOf('<div class="turnstile-widget"', start);
  assert.ok(start >= 0 && end > start);
  const minorFields = registerHtml.slice(start, end);
  assert.match(minorFields, /name="guardian_email"/);
  assert.match(minorFields, /name="age_confirmed"/);
  assert.doesNotMatch(minorFields, /name="email"/);
  assert.doesNotMatch(minorFields, /name="password"/);
  assert.doesNotMatch(minorFields, /name="country_code"/);
  const requestStart = authRoutes.indexOf("router.post('/guardian-consent-request'");
  const requestEnd = authRoutes.indexOf("router.get('/guardian-consent-info'", requestStart);
  const requestRoute = authRoutes.slice(requestStart, requestEnd);
  assert.ok(requestStart >= 0 && requestEnd > requestStart);
  assert.doesNotMatch(requestRoute, /country_code|childEmail|password/);
  assert.match(guardianHtml, /name="country_code"/);
  assert.match(guardianJs, /country_code: String\(form\.get\('country_code'\)/);
});

test('parent page separately captures authority, Terms, Privacy and data consent', () => {
  assert.match(guardianHtml, /name="guardian_confirmed"/);
  assert.match(guardianHtml, /name="terms_accepted"/);
  assert.match(guardianHtml, /name="privacy_accepted"/);
  assert.match(guardianHtml, /name="personal_data_accepted"/);
  assert.match(guardianHtml, /name="minimum_age_confirmed"/);
  assert.match(guardianHtml, /name="country_code"/);
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

test('minor account creation happens only through the guardian approval route', () => {
  assert.match(authRoutes, /if \(!isAdultRegistration\(age_band, adult_confirmed\)\)/);
  assert.match(authRoutes, /if \(requiresGuardianConsent\(item\.age_band\) && !item\.guardian_consented_at\)/);
  assert.match(authRoutes, /guardian_consented_at\)/);
});

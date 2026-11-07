import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('billing routes are mounted exactly once in configured and fallback modes', () => {
  const server = read('server.js');
  assert.equal(server.split("app.use('/api/billing', billingRoutes);").length - 1, 1);
  assert.equal(server.split("app.use('/api/billing', notReady);").length - 1, 1);
});

test('general API hydration budget and sensitive endpoint limits are configured separately', () => {
  const server = read('server.js');
  assert.ok(server.includes('limit: 120'));
  assert.ok(server.includes("app.use('/api/auth/login', loginAttemptLimiter);"));
  assert.ok(server.includes("app.use('/api/auth/register', registrationAttemptLimiter);"));
});

test('all paid subscription terms are represented in UI, backend and migration', () => {
  const billing = read('src/routes/billing.js');
  const page = read('public/subscription.html');
  const migration = read('db/migrations/009_quarterly_subscription_plan.sql');
  for (const code of ['premium_monthly','premium_quarterly','premium_yearly']) {
    assert.ok(billing.includes(code));
    assert.ok(migration.includes(code));
  }
  assert.ok(page.includes('799 ₽'));
  assert.ok(page.includes('2 490 ₽'));
});

test('shared navigation and learner dashboard assets exist', () => {
  assert.ok(read('public/session.js').includes('site-nav'));
  assert.ok(read('public/plan.html').includes('data-dashboard-summary'));
  assert.ok(read('public/learning.js').includes('dashboardSummary'));
});

test('public registration requires legal, operator, localization and isolated database approval', () => {
  const auth = read('src/routes/auth.js');
  const privacy = read('public/privacy.html');
  const terms = read('public/terms.html');
  const server = read('server.js');
  assert.ok(auth.includes("REGISTRATION_ENABLED !== 'true'"));
  assert.ok(auth.includes("REGISTRATION_LEGAL_APPROVED !== 'true'"));
  assert.ok(auth.includes("REGISTRATION_DATABASE_ISOLATED !== 'true'"));
  assert.ok(auth.includes("process.env.DB_SCHEMA !== 'quiet_english_preview'"));
  assert.ok(server.includes("process.env.DB_SCHEMA !== 'quiet_english_preview'"));
  assert.ok(auth.includes("isAdultRegistration(age_band, adult_confirmed)"));
  assert.ok(auth.includes('verifyTurnstileToken'));
  assert.ok(server.includes("app.get('/api/registration-status'"));
  assert.ok(server.includes("REGISTRATION_LEGAL_APPROVED !== 'true'"));
  assert.ok(server.includes("REGISTRATION_DATABASE_ISOLATED !== 'true'"));
  assert.ok(server.includes("REGISTRATION_DATA_LOCALIZATION_APPROVED !== 'true'"));
  assert.ok(server.includes("REGISTRATION_OPERATOR_DETAILS_APPROVED !== 'true'"));
  assert.ok(server.includes('TURNSTILE_SITE_KEY'));
  assert.ok(server.includes("app.use('/api/auth/password/forgot', passwordRecoveryLimiter);"));
  assert.ok(server.includes("app.post('/api/chat', chatLimiter"));
  assert.ok(!privacy.includes('рабочим черновиком'));
  assert.ok(!terms.includes('Проект документа'));
  assert.ok(privacy.includes('Редакция 1.1'));
  assert.ok(terms.includes('Редакция 1.1'));
  assert.ok(privacy.includes('до родительского подтверждения'));
  assert.ok(terms.includes('13 лет'));
});

test('offline storage and service-worker cache are present after release updates', () => {
  const offlineClient = read('public/offline-client.js');
  const serviceWorker = read('public/sw.js');
  const dictionary = read('public/dictionary.html');
  assert.ok(offlineClient.includes('window.QuietOffline = { save, all, remove }'));
  assert.ok(offlineClient.includes('navigator.serviceWorker.register'));
  assert.ok(serviceWorker.includes("const CACHE='quiet-english-shell-v3'"));
  assert.ok(serviceWorker.includes('"/register.html"'));
  assert.equal(dictionary.split('/offline-client.js').length - 1, 1);
});

test('registration UI supports age bands and cannot submit before readiness and Turnstile succeed', () => {
  const authJs = read('public/auth.js');
  const registerHtml = read('public/register.html');
  assert.ok(authJs.includes('/api/registration-status'));
  assert.ok(authJs.includes('turnstile.render'));
  assert.ok(authJs.includes('turnstile_token: captchaToken'));
  assert.ok(registerHtml.includes('type="submit" disabled'));
  assert.ok(registerHtml.includes('name="age_band"'));
  assert.ok(registerHtml.includes('value="13_15"'));
  assert.ok(registerHtml.includes('value="16_17"'));
  assert.ok(registerHtml.includes('value="18_plus"'));
  assert.ok(registerHtml.includes('name="adult_confirmed"'));
  assert.ok(authJs.includes("adult_confirmed: form.get('adult_confirmed') === 'on'"));
  assert.ok(registerHtml.includes('data-turnstile-captcha'));
  assert.ok(!registerHtml.includes('<select id="age-band"'));
  assert.ok(registerHtml.includes('data-minor-fields'));
  assert.ok(authJs.includes("authRequest('/guardian-consent-request'"));
});

test('password recovery and public AI chat have dedicated rate limits', () => {
  const server = read('server.js');
  assert.ok(server.includes('const passwordRecoveryLimiter = rateLimit'));
  assert.ok(server.includes("app.use('/api/auth/password/forgot', passwordRecoveryLimiter);"));
  assert.ok(server.includes('const chatLimiter = rateLimit'));
  assert.ok(server.includes("app.post('/api/chat', chatLimiter"));
});

test('email verification can be resent safely after a temporary delivery failure', () => {
  const authRoute = read('src/routes/auth.js');
  const authClient = read('public/auth.js');
  const registerPage = read('public/register.html');
  const server = read('server.js');
  assert.ok(authRoute.includes("router.post('/resend-verification'"));
  assert.ok(authClient.includes("authRequest('/resend-verification'"));
  assert.ok(registerPage.includes('data-resend-verification'));
  assert.ok(server.includes("app.use('/api/auth/resend-verification', emailResendLimiter);"));
});

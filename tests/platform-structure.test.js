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
  assert.ok(auth.includes('isRegistrationDatabaseIsolated()'));
  assert.ok(server.includes('isRegistrationDatabaseIsolated()'));
  assert.ok(auth.includes("REGISTRATION_REGION_SERVICES_APPROVED !== 'true'"));
  assert.ok(server.includes("REGISTRATION_REGION_SERVICES_APPROVED !== 'true'"));
  assert.ok(auth.includes("isAdultRegistration(age_band, adult_confirmed)"));
  assert.ok(auth.includes('verifyTurnstileToken'));
  assert.ok(server.includes("app.get('/api/registration-status'"));
  assert.ok(server.includes("REGISTRATION_LEGAL_APPROVED !== 'true'"));
  assert.ok(server.includes('isRegistrationDatabaseIsolated()'));
  assert.ok(server.includes("REGISTRATION_DATA_LOCALIZATION_APPROVED !== 'true'"));
  assert.ok(server.includes("REGISTRATION_OPERATOR_DETAILS_APPROVED !== 'true'"));
  assert.ok(server.includes('TURNSTILE_SITE_KEY'));
  assert.ok(server.includes("app.use('/api/auth/password/forgot', passwordRecoveryLimiter);"));
  assert.ok(server.includes("app.post('/api/chat', chatLimiter"));
  assert.ok(!privacy.includes('рабочим черновиком'));
  assert.ok(!terms.includes('Проект документа'));
  assert.ok(privacy.includes('Редакция 1.3'));
  assert.ok(terms.includes('Редакция 1.3'));
  assert.ok(privacy.includes('Говорушкин Сергей Леонтьевич'));
  assert.ok(terms.includes('Говорушкин Сергей Леонтьевич'));
  assert.ok(read('public/data-consent.html').includes('Говорушкин Сергей Леонтьевич'));
  assert.ok(privacy.includes('rozinilya777@gmail.com'));
  assert.ok(terms.includes('г. Москва, ул. 1-я Тверская-Ямская, д. 6'));
  assert.ok(!privacy.includes('предварительный текст'));
  assert.ok(!terms.includes('предварительный текст'));
  assert.ok(!read('public/data-consent.html').includes('предварительный текст'));
  assert.ok(privacy.includes('Создание новых аккаунтов несовершеннолетних отключено'));
  assert.ok(terms.includes('только совершеннолетние пользователи (18+)'));
  assert.ok(terms.includes('Германия или Италия'));
});

test('Russian deployment secrets are excluded from Git and container build context', () => {
  const gitignore = read('.gitignore');
  const dockerignore = read('.dockerignore');
  assert.ok(gitignore.split(String.fromCharCode(10)).includes('.env.ru'));
  assert.ok(dockerignore.includes('.env.*'));
  assert.ok(dockerignore.includes('!.env.ru.example'));
});

test('all public pages use local font fallbacks instead of third-party Google Fonts', () => {
  const pages = fs.readdirSync(path.join(process.cwd(), 'public')).filter(file => file.endsWith('.html'));
  assert.ok(pages.length > 0);
  for (const page of pages) {
    const html = read('public/' + page);
    assert.ok(!html.includes('fonts.googleapis.com'), page + ' still loads Google Fonts');
    assert.ok(!html.includes('fonts.gstatic.com'), page + ' still contacts Google Fonts assets');
  }
});

test('Russian deployments block registration and external personal-data processors until approved', () => {
  const regional = read('src/region-config.js');
  const auth = read('src/routes/auth.js');
  const server = read('server.js');
  const writing = read('src/routes/writing.js');
  const studyTools = read('src/routes/study-tools.js');
  const billing = read('src/routes/billing.js');
  const knowledge = read('src/routes/knowledge.js');
  assert.ok(regional.includes("env.REGION_EXTERNAL_PROCESSORS_APPROVED === 'true'"));
  assert.ok(auth.includes('isExternalPersonalDataProcessingAllowed()'));
  assert.ok(server.includes('isExternalPersonalDataProcessingAllowed()'));
  assert.ok(writing.includes('isExternalPersonalDataProcessingAllowed()'));
  assert.ok(studyTools.includes('isExternalPersonalDataProcessingAllowed()'));
  assert.ok(billing.includes('isExternalPersonalDataProcessingAllowed()'));
  assert.ok(knowledge.includes('isExternalPersonalDataProcessingAllowed()'));
  assert.ok(auth.includes("REGISTRATION_REGION_SERVICES_APPROVED !== 'true'"));
  assert.ok(server.includes("REGISTRATION_REGION_SERVICES_APPROVED !== 'true'"));
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

test('registration UI is adult-only and cannot submit before readiness and Turnstile succeed', () => {
  const authJs = read('public/auth.js');
  const registerHtml = read('public/register.html');
  const authRoutes = read('src/routes/auth.js');
  assert.ok(authJs.includes('/api/registration-status'));
  assert.ok(authJs.includes('turnstile.render'));
  assert.ok(authJs.includes('turnstile_token: captchaToken'));
  assert.ok(registerHtml.includes('type="submit" disabled'));
  assert.ok(registerHtml.includes('name="age_band" value="18_plus"'));
  assert.ok(!registerHtml.includes('value="13_15"'));
  assert.ok(!registerHtml.includes('value="16_17"'));
  assert.ok(registerHtml.includes('name="adult_confirmed"'));
  assert.ok(authJs.includes("adult_confirmed: form.get('adult_confirmed') === 'on'"));
  assert.ok(authJs.includes("ageBandField?.value !== '18_plus'"));
  assert.ok(registerHtml.includes('data-turnstile-captcha'));
  assert.ok(!registerHtml.includes('<select id="age-band"'));
  assert.ok(!registerHtml.includes('data-minor-fields'));
  assert.ok(!authJs.includes("authRequest('/guardian-consent-request'"));
  assert.ok(authRoutes.includes('isMinorRegistrationEnabled'));
  assert.ok(registerHtml.includes('name="country_code"'));
  assert.ok(registerHtml.includes('value="DE"'));
  assert.ok(registerHtml.includes('value="IT"'));
  assert.ok(authJs.includes("country_code: countryField?.value"));
  assert.ok(authRoutes.includes('isPilotCountryCode(country_code)'));
  const server = read('server.js');
  assert.ok(server.includes('minimumAge: 18'));
  assert.ok(server.includes("pilotCountries: ['DE', 'IT']"));
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

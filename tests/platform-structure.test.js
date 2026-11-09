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
  assert.ok(serviceWorker.includes("const CACHE='quiet-english-shell-v6'"));
  assert.ok(serviceWorker.includes("url.pathname === '/' ? '/' : url.pathname"));
  assert.ok(serviceWorker.includes("url.pathname === '/styles.css'"));
  assert.ok(serviceWorker.includes('cache.match(request, { ignoreSearch: true })'));
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

test('preview startup logs registration readiness without exposing secrets', () => {
  const server = read('server.js');
  assert.ok(server.includes("if (getAppRegion() === 'preview')"));
  assert.ok(server.includes("event: 'registration.readiness'"));
  assert.ok(server.includes('available: readiness.available'));
  assert.ok(server.includes('blockers: readiness.blockers'));
  assert.ok(!server.includes('TURNSTILE_SECRET_KEY:'));
  assert.ok(!server.includes('RESEND_API_KEY:'));
});

test('login explains unverified email separately and offers resend verification', () => {
  const auth = read('src/routes/auth.js');
  const client = read('public/auth.js');
  const loginPage = read('public/login.html');
  const registerPage = read('public/register.html');

  assert.ok(auth.includes("code: 'EMAIL_NOT_VERIFIED'"));
  assert.ok(auth.includes("code: 'ACCOUNT_NOT_ACTIVE'"));
  assert.ok(client.includes("error.code === 'EMAIL_NOT_VERIFIED'"));
  assert.ok(client.includes("authRequest('/resend-verification'"));
  assert.ok(loginPage.includes('data-resend-login-verification hidden'));
  assert.ok(client.includes('resendButton.hidden = false'));
  assert.ok(registerPage.includes('data-resend-verification hidden'));
});

test('shared app pages load the responsive site stylesheet', () => {
  const pages = [
    'public/admin.html',
    'public/errors.html',
    'public/exercise.html',
    'public/forgot-password.html',
    'public/guardian-approval.html',
    'public/knowledge-map.html',
    'public/library.html',
    'public/placement.html',
    'public/reset-password.html',
    'public/topics.html',
    'public/verify.html'
  ];

  for (const page of pages) {
    const html = read(page);
    assert.ok(html.includes('/styles.css'), `${page} must load styles.css`);
    assert.ok(html.includes('name="viewport"'), `${page} must declare a mobile viewport`);
  }

  assert.ok(read('public/guardian-approval.html').startsWith('<!doctype html>'));
});

test('PWA manifest, install metadata, and offline shell are configured', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  const index = read('public/index.html');
  const login = read('public/login.html');
  const library = read('public/library.html');
  const serviceWorker = read('public/sw.js');
  const installScript = read('public/pwa-install.js');

  assert.equal(manifest.name, 'Quiet English');
  assert.equal(manifest.start_url, '/?source=installed-app');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const html of [index, login, library]) {
    assert.ok(html.includes('rel="manifest"'));
    assert.ok(html.includes('apple-touch-icon'));
  }
  assert.ok(index.includes('data-pwa-install-card'));
  assert.ok(installScript.includes('beforeinstallprompt'));
  assert.ok(installScript.includes('На экран Домой'));
  assert.ok(serviceWorker.includes("const CACHE='quiet-english-shell-v6'"));
  assert.ok(serviceWorker.includes('"/manifest.webmanifest"'));
  assert.ok(serviceWorker.includes('"/library.html"'));
});

test('Android preview TWA targets API 36 and does not embed signing secrets', () => {
  const gradle = read('android/app/build.gradle');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  const workflow = read('.github/workflows/mobile-app.yml');
  const docs = read('android/README.md');

  assert.ok(gradle.includes('targetSdk 36'));
  assert.ok(gradle.includes('com.vertexblitz.quietenglish.preview'));
  assert.ok(gradle.includes('androidbrowserhelper:androidbrowserhelper:2.7.3'));
  assert.ok(manifest.includes('quiet-english-speaking-preview.onrender.com'));
  assert.ok(workflow.includes('app-release.aab'));
  assert.ok(workflow.includes('ANDROID_KEYSTORE_BASE64'));
  assert.ok(docs.includes('Digital Asset Links'));
  assert.ok(!gradle.includes('BEGIN PRIVATE KEY'));
});

test('Digital Asset Links are served explicitly from the public well-known path', () => {
  const server = read('server.js');
  const assetLinks = JSON.parse(read('public/.well-known/assetlinks.json'));
  assert.ok(server.includes("app.get('/.well-known/assetlinks.json'"));
  assert.deepEqual(assetLinks, []);
});

test('Android release versions can be supplied from a unique GitHub Actions run', () => {
  const gradle = read('android/app/build.gradle');
  const workflow = read('.github/workflows/mobile-app.yml');
  assert.ok(gradle.includes('gradleProperty("appVersionCode")'));
  assert.ok(gradle.includes('gradleProperty("appVersionName")'));
  assert.ok(workflow.includes('GITHUB_RUN_NUMBER'));
  assert.ok(workflow.includes('GITHUB_REF_NAME#quiet-english-preview-v'));
});



test('Android signing key material is excluded and release workflow fails closed without secrets', () => {
  const ignore = read('.gitignore');
  const workflow = read('.github/workflows/mobile-app.yml');
  const androidDocs = read('android/README.md');
  const psScript = read('android/scripts/create-upload-key.ps1');
  const shScript = read('android/scripts/create-upload-key.sh');

  assert.ok(ignore.includes('android/signing/'));
  assert.ok(workflow.includes('::error::Release signing secrets are missing'));
  assert.ok(workflow.includes('keytool -list -keystore'));
  assert.ok(androidDocs.includes('com.vertexblitz.quietenglish.preview'));
  assert.ok(androidDocs.includes('Internal testing'));
  assert.ok(psScript.includes('quietenglish-upload'));
  assert.ok(shScript.includes('quietenglish-upload'));
});

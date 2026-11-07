import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = file => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('billing routes are mounted exactly once in configured and fallback modes', () => {
  const server = read('server.js');
  assert.equal((server.match(/app\\.use\\('\\/api\\/billing', billingRoutes\\);/g) || []).length, 1);
  assert.equal((server.match(/app\\.use\\('\\/api\\/billing', notReady\\);/g) || []).length, 1);
});

test('general API hydration budget and sensitive endpoint limits are configured separately', () => {
  const server = read('server.js');
  assert.match(server, /limit:\\s*120/);
  assert.match(server, /app\\.use\\('\\/api\\/auth\\/login', loginAttemptLimiter\\)/);
  assert.match(server, /app\\.use\\('\\/api\\/auth\\/register', registrationAttemptLimiter\\)/);
});

test('all paid subscription terms are represented in UI, backend and migration', () => {
  const billing = read('src/routes/billing.js');
  const page = read('public/subscription.html');
  const migration = read('db/migrations/009_quarterly_subscription_plan.sql');
  for (const code of ['premium_monthly','premium_quarterly','premium_yearly']) {
    assert.ok(billing.includes(code));
    assert.ok(migration.includes(code));
  }
  assert.match(page, /799 ₽/);
  assert.match(page, /2 490 ₽/);
});

test('shared navigation and learner dashboard assets exist', () => {
  assert.ok(read('public/session.js').includes('site-nav'));
  assert.ok(read('public/plan.html').includes('data-dashboard-summary'));
  assert.ok(read('public/learning.js').includes('dashboardSummary'));
});

test('registration stays closed until the operator approves legal and privacy documents', () => {
  const auth = read('src/routes/auth.js');
  const privacy = read('public/privacy.html');
  const terms = read('public/terms.html');
  assert.match(auth, /REGISTRATION_ENABLED !== 'true'/);
  assert.match(privacy, /рабочий черновик/);
  assert.match(terms, /Проект документа/);
});

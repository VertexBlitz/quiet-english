import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdultRegistration,
  normalizeCountryCode,
  isValidCountryCode,
  isValidTurnstileResult,
  verifyTurnstileToken,
  REGISTRATION_CAPTCHA_ACTION
} from '../src/registration-security.js';

test('public signup accepts adults only', () => {
  assert.equal(isAdultRegistration('18_plus'), true);
  assert.equal(isAdultRegistration('16_17'), false);
  assert.equal(isAdultRegistration('13_15'), false);
  assert.equal(isAdultRegistration(undefined), false);
});

test('country codes are normalized and validated without limiting adult countries', () => {
  assert.equal(normalizeCountryCode(' de '), 'DE');
  assert.equal(isValidCountryCode('DE'), true);
  assert.equal(isValidCountryCode('US'), true);
  assert.equal(isValidCountryCode('RUS'), false);
  assert.equal(isValidCountryCode(''), false);
});

test('Turnstile Siteverify result must be successful and match hostname and action', () => {
  const valid = {
    success: true,
    hostname: 'quiet-english-speaking-preview.onrender.com',
    action: REGISTRATION_CAPTCHA_ACTION
  };
  assert.equal(isValidTurnstileResult(valid, 'quiet-english-speaking-preview.onrender.com'), true);
  assert.equal(isValidTurnstileResult({ ...valid, success: false }, valid.hostname), false);
  assert.equal(isValidTurnstileResult({ ...valid, hostname: 'attacker.example' }, valid.hostname), false);
  assert.equal(isValidTurnstileResult({ ...valid, action: 'login' }, valid.hostname), false);
});

test('Turnstile verification sends token to Siteverify and accepts a valid one', async () => {
  let request;
  const result = await verifyTurnstileToken('single-use-token', {
    secretKey: 'test-secret',
    expectedHostname: 'quiet-english-speaking-preview.onrender.com',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({
          success: true,
          hostname: 'quiet-english-speaking-preview.onrender.com',
          action: REGISTRATION_CAPTCHA_ACTION
        })
      };
    }
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(request.url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(request.options.method, 'POST');
  assert.equal(new URLSearchParams(request.options.body).get('response'), 'single-use-token');
  assert.equal(new URLSearchParams(request.options.body).get('secret'), 'test-secret');
});

test('Turnstile verification fails closed when not configured or invalid', async () => {
  assert.deepEqual(
    await verifyTurnstileToken('token', { secretKey: '', expectedHostname: 'example.com' }),
    { ok: false, reason: 'not_configured' }
  );
  assert.deepEqual(
    await verifyTurnstileToken('', { secretKey: 'secret', expectedHostname: 'example.com' }),
    { ok: false, reason: 'invalid_token' }
  );
});
